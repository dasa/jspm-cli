import { ImportMap } from "./tracemap";

/*
 *   Copyright 2020 Guy Bedford
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

export let baseUrl: URL;
if (typeof process !== 'undefined' && process.versions.node) {
  baseUrl = new URL('file://' + process.cwd() + '/');
}
else if (typeof document !== 'undefined') {
  const baseEl: HTMLBaseElement | null = document.querySelector('base[href]');
  if (baseEl)
    baseUrl = new URL(baseEl.href + (baseEl.href.endsWith('/') ? '' : '/'));
  else if (typeof location !== 'undefined')
    baseUrl = new URL('../', new URL(location.href));
}

export interface DecoratedError extends Error {
  code: string;
}

export function decorateError (err: Error, code: string): DecoratedError {
  const decorated = <DecoratedError>err;
  decorated.code = code;
  return decorated;
}

export function deepClone (obj) {
  const outObj = Object.create(null);
  for (const p of Object.keys(obj)) {
    const val = obj[p];
    if (Array.isArray(val))
      outObj[p] = [...val];
    else if (typeof val === 'object' && val !== null)
      outObj[p] = deepClone(val);
    else
      outObj[p] = val;
  }
  return outObj;
}

export function alphabetize<T> (obj: T): T {
  const out: T = <T>{};
  for (const key of Object.keys(obj).sort())
    out[key] = obj[key];
  return out;
}

export interface JsonStyle {
  tab: string,
  newline: string,
  trailingNewline: string,
  indent: string,
  quote: string
};

export const defaultStyle = {
  tab: '  ',
  newline: require('os').EOL,
  trailingNewline: require('os').EOL,
  indent: '',
  quote: '"'
};

export function detectStyle (string: string): JsonStyle {
  let style = Object.assign({}, defaultStyle);

  let newLineMatch = string.match( /\r?\n|\r(?!\n)/);
  if (newLineMatch)
    style.newline = newLineMatch[0];

  // best-effort tab detection
  // yes this is overkill, but it avoids possibly annoying edge cases
  let lines = string.split(style.newline);
  let indent;
  for (const line of lines) {
    const curIndent = line.match(/^\s*[^\s]/);
    if (curIndent && (indent === undefined || curIndent.length < indent.length))
      indent = curIndent[0].slice(0, -1);
  }
  if (indent !== undefined)
    style.indent = indent;
  lines = lines.map(line => line.slice(indent.length));
  let tabSpaces = lines.map(line => line.match(/^[ \t]*/)?.[0] || '') || [];
  let tabDifferenceFreqs = {};
  let lastLength = 0;
  tabSpaces.forEach(tabSpace => {
    let diff = Math.abs(tabSpace.length - lastLength);
    if (diff !== 0)
      tabDifferenceFreqs[diff] = (tabDifferenceFreqs[diff] || 0) + 1;
    lastLength = tabSpace.length;
  });
  let bestTabLength;
  Object.keys(tabDifferenceFreqs).forEach(tabLength => {
    if (!bestTabLength || tabDifferenceFreqs[tabLength] >= tabDifferenceFreqs[bestTabLength])
      bestTabLength = tabLength;
  });
  // having determined the most common spacing difference length,
  // generate samples of this tab length from the end of each line space
  // the most common sample is then the tab string
  let tabSamples = {};
  tabSpaces.forEach(tabSpace => {
    let sample = tabSpace.substr(tabSpace.length - bestTabLength);
    tabSamples[sample] = (tabSamples[sample] || 0) + 1;
  });
  let bestTabSample;
  Object.keys(tabSamples).forEach(sample => {
    if (!bestTabSample || tabSamples[sample] > tabSamples[bestTabSample])
      bestTabSample = sample;
  });

  if (bestTabSample)
    style.tab = bestTabSample;

  let quoteMatch = string.match(/"|'/);
  if (quoteMatch)
    style.quote = quoteMatch[0];

  style.trailingNewline = string && string.match(new RegExp(style.newline + '$')) ? style.newline : '';

  return style;
}

export function jsonEquals (sourceA: string | object, sourceB: string | object): boolean {
  if (typeof sourceA === 'string') {
    try {
      sourceA = JSON.parse(sourceA);
    }
    catch (e) {
      return false;
    }
  }
  if (typeof sourceB === 'string') {
    try {
      sourceB = JSON.parse(sourceB);
    }
    catch (e) {
      return false;
    }
  }
  return JSON.stringify(sourceA) === JSON.stringify(sourceB);
}

export function jsonParseStyled (source: string, fileName?: string): { json: any, style: JsonStyle } {
  // remove any byte order mark
  if (source.startsWith('\uFEFF'))
    source = source.substr(1);

  let style = detectStyle(source);
  try {
    return { json: JSON.parse(source), style };
  }
  catch (e) {
    throw new Error(`Error parsing JSON file${fileName ? ' ' + fileName : ''}`);
  }
}

export function jsonStringifyStyled (json, style: JsonStyle) {
  let jsonString = JSON.stringify(json, null, style.tab);

  return style.indent + jsonString
      .replace(/([^\\])""/g, '$1' + style.quote + style.quote) // empty strings
      .replace(/([^\\])"/g, '$1' + style.quote)
      .replace(/\n/g, style.newline + style.indent) + (style.trailingNewline || '');
}

export function findHtmlImportMap (source: string, fileName: string, system: boolean) {
  let importMapStart = -1;
  if (system) importMapStart = source.indexOf('<script type="systemjs-importmap');
  if (importMapStart === -1) importMapStart = source.indexOf('<script type="importmap');
  if (importMapStart === -1) importMapStart = source.indexOf('<script type="systemjs-importmap');
  if (importMapStart === -1)
    throw new Error(`Unable to find an import map section in ${fileName}. You need to first manually include a <script type="importmap"> or <script type="importmap-shim"> section.`);
  const importMapInner = source.indexOf('>', importMapStart);
  const srcStart = source.indexOf('src=', importMapStart);
  const importMapEnd = source.indexOf('<', importMapInner);
  if (srcStart < importMapEnd && srcStart !== -1)
    throw new Error(`${fileName} references an external import map. Rather install from/to this file directly.`);
  return {
    type: [importMapStart + 14, source.indexOf('"', importMapStart + 15)],
    map: [importMapInner + 1, importMapEnd]
  };
}

export function sort (map: ImportMap) {
  const sorted: ImportMap = {
    imports: alphabetize(map.imports),
    scopes: alphabetize(map.scopes),
    depcache: alphabetize(map.depcache)
  };
  for (const scope of Object.keys(sorted.scopes))
    sorted.scopes[scope] = alphabetize(sorted.scopes[scope]);
  return sorted;
}

export function isURL (specifier: string) {
  if (specifier.startsWith('/'))
    return true;
  try {
    new URL(specifier);
  }
  catch {
    return false;
  }
  return true;
}

export function isPlain (specifier: string) {
  if (specifier.startsWith('./') || specifier.startsWith('../'))
    return false;
  return !isURL(specifier);
}

export function getPackageName (specifier: string, parentUrl: URL) {
  let sepIndex = specifier.indexOf('/');
  if (specifier[0] === '@') {
    if (sepIndex === -1)
      throw new Error(`${specifier} is not an invalid scope name, imported from ${parentUrl.href}.`);
    sepIndex = specifier.indexOf('/', sepIndex + 1);
  }
  return sepIndex === -1 ? specifier : specifier.slice(0, sepIndex);
}