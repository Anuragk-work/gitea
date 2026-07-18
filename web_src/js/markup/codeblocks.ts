import {svg, type SvgName} from '../svg.ts';
import {createElementFromAttrs, queryElems} from '../utils/dom.ts';
import {localUserSettings} from '../modules/user-settings.ts';

const {code_toggle_wrap} = window.config.i18n;

// the key used to persist the user's "wrap code lines" preference via localUserSettings.
// this is a single global toggle (per user decision), not per-block.
const wrapMarkupCodeKey = 'wrap-markup-code';

/** Create a control button (e.g.: copy, wrap-toggle, mermaid zoom) to be placed inside a button-row container. */
export function makeCodeBlockButton(iconName: SvgName, classNames: string | string[], attrs: Record<string, string> = {}): HTMLButtonElement {
  const className = Array.isArray(classNames) ? classNames.join(' ') : classNames;
  const btn = createElementFromAttrs<HTMLButtonElement>('button', {
    class: `ui compact icon button ${className}`,
    type: 'button',
    ...attrs,
  });
  btn.innerHTML = svg(iconName);
  return btn;
}

export function makeCodeCopyButton(attrs: Record<string, string> = {}): HTMLButtonElement {
  return makeCodeBlockButton('octicon-copy', 'code-copy auto-hide-control', attrs);
}

/** Create a button-row container (shared layout/positioning) to hold code-block control buttons,
 *  e.g.: the copy/wrap-toggle row on a `.code-block`/`.code-block-container`, or mermaid's view-controller row.
 *  `classNames` are additional classes appended to the shared row classes (e.g.: `view-controller` for mermaid). */
export function makeCodeBlockButtonRow(classNames: string | string[], ...buttons: HTMLButtonElement[]): HTMLDivElement {
  const className = Array.isArray(classNames) ? classNames.join(' ') : classNames;
  return createElementFromAttrs<HTMLDivElement>('div', {class: `code-block-button-row auto-hide-control flex-text-block ${className}`}, ...buttons);
}

function applyCodeBlockWrap(btnContainer: Element, wrapEnabled: boolean) {
  btnContainer.classList.toggle('code-overflow-wrap', wrapEnabled);
  btnContainer.classList.toggle('code-overflow-scroll', !wrapEnabled);
}

function makeCodeWrapButton(btnContainer: Element, wrapEnabled: boolean): HTMLButtonElement {
  const btn = makeCodeBlockButton('material-wrap-text', 'code-wrap auto-hide-control', {
    'title': code_toggle_wrap,
    'aria-label': code_toggle_wrap,
  });
  btn.toggleAttribute('data-active', wrapEnabled);
  btn.addEventListener('click', () => {
    const newWrapEnabled = !btn.hasAttribute('data-active');
    btn.toggleAttribute('data-active', newWrapEnabled);
    applyCodeBlockWrap(btnContainer, newWrapEnabled);
    localUserSettings.setBoolean(wrapMarkupCodeKey, newWrapEnabled);
  });
  return btn;
}

export function initMarkupCodeCopy(elMarkup: HTMLElement): void {
  // wrap preference is a single global toggle (per user decision), read once per pass and applied to all code blocks
  const wrapEnabled = localUserSettings.getBoolean(wrapMarkupCodeKey);

  // .markup .code-block code
  queryElems(elMarkup, '.code-block code', (el) => {
    if (!el.textContent) return;
    // we only want to use `.code-block-container` if it exists, no matter `.code-block` exists or not.
    const btnContainer = el.closest('.code-block-container') ?? el.closest('.code-block')!;
    applyCodeBlockWrap(btnContainer, wrapEnabled);

    // remove final trailing newline introduced during HTML rendering
    const copyBtn = makeCodeCopyButton({
      'data-clipboard-text': el.textContent.replace(/\r?\n$/, ''),
    });
    const wrapBtn = makeCodeWrapButton(btnContainer, wrapEnabled);
    btnContainer.append(makeCodeBlockButtonRow('code-block-controls', copyBtn, wrapBtn));
  });
}
