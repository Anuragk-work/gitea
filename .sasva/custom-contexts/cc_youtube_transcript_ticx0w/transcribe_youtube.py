#!/usr/bin/env python3
"""
Custom Context data fetcher: YouTube -> audio (yt-dlp) -> normalize (ffmpeg) -> transcript (whisper)

Writes JSONL to $OUTPUT_FILE:
  - 1 record with record_type="video_metadata" (title, channel, duration, url)
  - N records with record_type="transcript_segment" (start, end, text) - one per whisper segment

Requires on PATH: yt-dlp, ffmpeg, whisper (openai-whisper CLI)
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile


def run(cmd, **kwargs):
    print(f"[transcribe_youtube] $ {' '.join(cmd)}", file=sys.stderr)
    return subprocess.run(cmd, check=True, **kwargs)


def get_metadata(url):
    result = subprocess.run(
        ["yt-dlp", "--skip-download", "--print-json", url],
        check=True, capture_output=True, text=True,
    )
    # yt-dlp may emit warnings on stdout before JSON in some versions; take last line
    line = result.stdout.strip().splitlines()[-1]
    data = json.loads(line)
    return {
        "video_id": data.get("id"),
        "title": data.get("title"),
        "channel": data.get("channel") or data.get("uploader"),
        "duration_sec": data.get("duration"),
        "url": url,
        "webpage_url": data.get("webpage_url", url),
    }


def download_audio(url, workdir):
    out_template = os.path.join(workdir, "audio.%(ext)s")
    run(["yt-dlp", "-x", "--audio-format", "wav", "-o", out_template, url])
    for f in os.listdir(workdir):
        if f.startswith("audio.") and f.endswith(".wav"):
            return os.path.join(workdir, f)
    raise RuntimeError("yt-dlp did not produce a .wav file")


def normalize_audio(src_wav, workdir):
    dst_wav = os.path.join(workdir, "audio_16k_mono.wav")
    run(["ffmpeg", "-y", "-i", src_wav, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", dst_wav])
    return dst_wav


def transcribe(wav_path, workdir, model):
    run([
        "whisper", wav_path,
        "--model", model,
        "--output_format", "json",
        "--output_dir", workdir,
        "--fp16", "False",
    ])
    base = os.path.splitext(os.path.basename(wav_path))[0]
    json_path = os.path.join(workdir, base + ".json")
    with open(json_path, "r") as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--model", default="small")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    with tempfile.TemporaryDirectory(prefix="yt_transcribe_") as workdir:
        metadata = get_metadata(args.url)
        raw_audio = download_audio(args.url, workdir)
        norm_audio = normalize_audio(raw_audio, workdir)
        result = transcribe(norm_audio, workdir, args.model)

        with open(args.output, "w") as out:
            meta_record = dict(metadata)
            meta_record["record_type"] = "video_metadata"
            meta_record["language"] = result.get("language")
            out.write(json.dumps(meta_record) + "\n")

            for seg in result.get("segments", []):
                seg_record = {
                    "record_type": "transcript_segment",
                    "video_id": metadata["video_id"],
                    "start": round(seg.get("start", 0), 2),
                    "end": round(seg.get("end", 0), 2),
                    "text": seg.get("text", "").strip(),
                }
                out.write(json.dumps(seg_record) + "\n")

    print(f"[transcribe_youtube] Done. Wrote output to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
