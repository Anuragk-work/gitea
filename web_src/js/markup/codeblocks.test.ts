import {
  initMarkupCodeCopy,
  makeCodeBlockButton,
  makeCodeBlockButtonRow,
  makeCodeCopyButton,
} from './codeblocks.ts';
import {localUserSettings} from '../modules/user-settings.ts';

const wrapMarkupCodeKey = 'wrap-markup-code';

beforeEach(() => {
  document.body.replaceChildren();
  // reset the persisted global wrap preference to its default (disabled) before each test,
  // going through `localUserSettings` (never raw `localStorage`) like production code does.
  localUserSettings.setBoolean(wrapMarkupCodeKey, false);
});

test('makeCodeBlockButton creates a button with the given icon, classes and attrs', () => {
  const btn = makeCodeBlockButton('octicon-copy', 'code-copy auto-hide-control', {'data-clipboard-text': 'hello'});
  expect(btn.tagName).toEqual('BUTTON');
  expect(btn.getAttribute('type')).toEqual('button');
  expect(btn.className).toEqual('ui compact icon button code-copy auto-hide-control');
  expect(btn.getAttribute('data-clipboard-text')).toEqual('hello');
  expect(btn.innerHTML).toMatch(/^<svg/);
});

test('makeCodeBlockButton accepts an array of class names', () => {
  const btn = makeCodeBlockButton('octicon-copy', ['code-copy', 'auto-hide-control']);
  expect(btn.className).toEqual('ui compact icon button code-copy auto-hide-control');
});

test('makeCodeCopyButton sets the copy classes and forwards extra attrs', () => {
  const btn = makeCodeCopyButton({'data-clipboard-text': 'copied text'});
  expect(btn.className).toEqual('ui compact icon button code-copy auto-hide-control');
  expect(btn.getAttribute('data-clipboard-text')).toEqual('copied text');
});

test('makeCodeBlockButtonRow wraps the provided buttons in a shared-layout container', () => {
  const btn1 = makeCodeCopyButton();
  const btn2 = makeCodeBlockButton('material-wrap-text', 'code-wrap');
  const row = makeCodeBlockButtonRow('code-block-controls', btn1, btn2);
  expect(row.tagName).toEqual('DIV');
  expect(row.className).toEqual('code-block-button-row auto-hide-control flex-text-block code-block-controls');
  expect(Array.from(row.children)).toEqual([btn1, btn2]);
});

test('makeCodeBlockButtonRow accepts an array of class names', () => {
  const row = makeCodeBlockButtonRow(['view-controller', 'extra-class']);
  expect(row.className).toEqual('code-block-button-row auto-hide-control flex-text-block view-controller extra-class');
});

test('initMarkupCodeCopy adds copy and wrap buttons to each non-empty code block', () => {
  document.body.innerHTML = `
    <div class="markup">
      <div class="code-block-container"><pre class="code-block"><code>console.log('hi');\n</code></pre></div>
      <pre class="code-block"><code></code></pre>
    </div>
  `;
  const elMarkup = document.querySelector<HTMLElement>('.markup')!;
  initMarkupCodeCopy(elMarkup);

  const containers = document.querySelectorAll('.code-block-container');
  expect(containers).toHaveLength(1);

  const buttonRow = containers[0].querySelector('.code-block-button-row')!;
  expect(buttonRow).not.toBeNull();
  expect(buttonRow.className).toEqual('code-block-button-row auto-hide-control flex-text-block code-block-controls');

  const copyBtn = buttonRow.querySelector<HTMLButtonElement>('.code-copy')!;
  expect(copyBtn).not.toBeNull();
  // trailing newline introduced by HTML rendering must be stripped from the copied text
  expect(copyBtn.getAttribute('data-clipboard-text')).toEqual("console.log('hi');");

  const wrapBtn = buttonRow.querySelector<HTMLButtonElement>('.code-wrap')!;
  expect(wrapBtn).not.toBeNull();
  expect(wrapBtn.getAttribute('title')).toEqual('Toggle line wrap');
  expect(wrapBtn.getAttribute('aria-label')).toEqual('Toggle line wrap');

  // the empty code block must be skipped entirely: no button row appended to it
  const emptyBlock = document.querySelectorAll('.code-block')[1];
  expect(emptyBlock.querySelector('.code-block-button-row')).toBeNull();
});

test('initMarkupCodeCopy prefers .code-block-container over .code-block when both exist', () => {
  document.body.innerHTML = `
    <div class="markup">
      <div class="code-block-container"><pre class="code-block"><code>text</code></pre></div>
    </div>
  `;
  const elMarkup = document.querySelector<HTMLElement>('.markup')!;
  initMarkupCodeCopy(elMarkup);

  const container = document.querySelector('.code-block-container')!;
  const codeBlock = document.querySelector('.code-block')!;
  expect(container.querySelector('.code-block-button-row')).not.toBeNull();
  // the button row is a child of the container, not appended a second time inside .code-block
  expect(codeBlock.querySelector('.code-block-button-row')).toBeNull();
});

test('initMarkupCodeCopy defaults to scroll (no wrap) when no preference is persisted', () => {
  document.body.innerHTML = `
    <div class="markup">
      <pre class="code-block"><code>plain text</code></pre>
    </div>
  `;
  const elMarkup = document.querySelector<HTMLElement>('.markup')!;
  initMarkupCodeCopy(elMarkup);

  const codeBlock = document.querySelector('.code-block')!;
  expect(codeBlock.classList.contains('code-overflow-scroll')).toBe(true);
  expect(codeBlock.classList.contains('code-overflow-wrap')).toBe(false);

  const wrapBtn = codeBlock.querySelector<HTMLButtonElement>('.code-wrap')!;
  expect(wrapBtn.hasAttribute('data-active')).toBe(false);
  expect(wrapBtn.getAttribute('aria-pressed')).toEqual('false');
});

test('initMarkupCodeCopy pre-applies a previously persisted global wrap preference', () => {
  localUserSettings.setBoolean(wrapMarkupCodeKey, true);

  document.body.innerHTML = `
    <div class="markup">
      <pre class="code-block"><code>plain text</code></pre>
    </div>
  `;
  const elMarkup = document.querySelector<HTMLElement>('.markup')!;
  initMarkupCodeCopy(elMarkup);

  const codeBlock = document.querySelector('.code-block')!;
  expect(codeBlock.classList.contains('code-overflow-wrap')).toBe(true);
  expect(codeBlock.classList.contains('code-overflow-scroll')).toBe(false);

  const wrapBtn = codeBlock.querySelector<HTMLButtonElement>('.code-wrap')!;
  expect(wrapBtn.hasAttribute('data-active')).toBe(true);
  expect(wrapBtn.getAttribute('aria-pressed')).toEqual('true');
});

test('clicking the wrap button toggles the wrap classes, button state and persists the global preference', () => {
  document.body.innerHTML = `
    <div class="markup">
      <pre class="code-block"><code>plain text</code></pre>
    </div>
  `;
  const elMarkup = document.querySelector<HTMLElement>('.markup')!;
  initMarkupCodeCopy(elMarkup);

  const codeBlock = document.querySelector('.code-block')!;
  const wrapBtn = codeBlock.querySelector<HTMLButtonElement>('.code-wrap')!;

  // this test file's config runs tests concurrently, so explicitly force a known starting
  // state instead of relying on ambient localStorage state possibly touched by other tests
  localUserSettings.setBoolean(wrapMarkupCodeKey, false);
  wrapBtn.toggleAttribute('data-active', false);
  wrapBtn.setAttribute('aria-pressed', 'false');

  wrapBtn.click();
  expect(codeBlock.classList.contains('code-overflow-wrap')).toBe(true);
  expect(codeBlock.classList.contains('code-overflow-scroll')).toBe(false);
  expect(wrapBtn.hasAttribute('data-active')).toBe(true);
  expect(wrapBtn.getAttribute('aria-pressed')).toEqual('true');
  expect(localUserSettings.getBoolean(wrapMarkupCodeKey)).toBe(true);

  wrapBtn.click();
  expect(codeBlock.classList.contains('code-overflow-wrap')).toBe(false);
  expect(codeBlock.classList.contains('code-overflow-scroll')).toBe(true);
  expect(wrapBtn.hasAttribute('data-active')).toBe(false);
  expect(wrapBtn.getAttribute('aria-pressed')).toEqual('false');
  expect(localUserSettings.getBoolean(wrapMarkupCodeKey)).toBe(false);
});

test('initMarkupCodeCopy applies the global preference identically across multiple code blocks', () => {
  localUserSettings.setBoolean(wrapMarkupCodeKey, true);

  document.body.innerHTML = `
    <div class="markup">
      <pre class="code-block"><code>block one</code></pre>
      <pre class="code-block"><code>block two</code></pre>
    </div>
  `;
  const elMarkup = document.querySelector<HTMLElement>('.markup')!;
  initMarkupCodeCopy(elMarkup);

  const codeBlocks = document.querySelectorAll('.code-block');
  expect(codeBlocks).toHaveLength(2);
  for (const block of codeBlocks) {
    expect(block.classList.contains('code-overflow-wrap')).toBe(true);
    const wrapBtn = block.querySelector<HTMLButtonElement>('.code-wrap')!;
    expect(wrapBtn.hasAttribute('data-active')).toBe(true);
  }
});
