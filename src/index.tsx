import { assert } from '@stefanprobst/assert'
import { useRouter } from 'next/router.js'
import type { ElementType, ReactNode } from 'react'
import { createContext, Fragment, useContext, useMemo } from 'react'
// @ts-expect-error
import { jsx as _jsx } from 'react/jsx-runtime'

type DictionaryMap = object
type TranslateKeyPath = Array<number | string> | string
type TranslateOptions = {
  values?: Record<number | string, string>
  components?: Record<string, ElementType>
  count?: number
  // locale?: string
}

export interface I18nService<
  TDictionaryMap extends DictionaryMap = DictionaryMap,
  TLocale extends string = string,
> {
  formatDateTime: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string
  formatList: (value: Array<string>, options?: Intl.ListFormatOptions) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatRelativeTime: (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
  ) => string
  locale: TLocale | undefined
  plural: (value: number, options?: Intl.PluralRulesOptions) => Intl.LDMLPluralRule
  sort: (value: Array<string>, options?: Intl.CollatorOptions) => Array<string>
  createCollator: (options?: Intl.CollatorOptions) => Intl.Collator['compare']
  t: (
    keypath: KeyPathStrings<TDictionaryMap> | KeyPathTuples<TDictionaryMap>,
    options?: TranslateOptions,
  ) => string
}

const I18nContext = createContext<I18nService | null>(null)
if (process.env['NODE_ENV'] !== 'production') {
  I18nContext.displayName = 'I18nContext'
}

export function useI18n<
  TDictionaryMap extends DictionaryMap,
  TLocale extends string = string,
>(): I18nService<TDictionaryMap, TLocale> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = useContext<I18nService<TDictionaryMap, TLocale> | null>(I18nContext as any)

  assert(value != null, '`useI18n` must be nested inside an `I18nProvider`.')

  return value
}

interface I18nProviderProps {
  children?: ReactNode
  dictionaries: DictionaryMap
}

export function I18nProvider(props: I18nProviderProps): JSX.Element {
  const { dictionaries } = props
  const router = useRouter()
  const locale = router.locale

  const service = useMemo(() => {
    assert(locale != null, 'Please configure locales in Next.js config.')
    return createI18nService(locale, dictionaries)
  }, [locale, dictionaries])

  return <I18nContext.Provider value={service}>{props.children}</I18nContext.Provider>
}

//

export function createI18nService<
  TDictionaryMap extends DictionaryMap = DictionaryMap,
  TLocale extends string = string,
>(locale: TLocale, dictionaries: TDictionaryMap): I18nService<TDictionaryMap, TLocale> {
  function formatDateTime(value: Date | number, options?: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat(locale, options).format(value)
  }

  function formatList(value: Array<string>, options?: Intl.ListFormatOptions) {
    return new Intl.ListFormat(locale, options).format(value)
  }

  function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat(locale, options).format(value)
  }

  function formatRelativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
  ) {
    return new Intl.RelativeTimeFormat(locale, options).format(value, unit)
  }

  function plural(value: number, options?: Intl.PluralRulesOptions) {
    return new Intl.PluralRules(locale, options).select(value)
  }

  function sort(value: Array<string>, options?: Intl.CollatorOptions) {
    return value.sort(new Intl.Collator(locale, options).compare)
  }

  function createCollator(options?: Intl.CollatorOptions) {
    return new Intl.Collator(locale, options).compare
  }

  function translate(keypath: TranslateKeyPath, options?: TranslateOptions) {
    const entry = get(dictionaries, keypath) as string | undefined
    if (entry == null) return ''

    if (options == null) return entry

    const interpolated =
      options.values != null && Object.keys(options.values).length > 0
        ? interpolate(entry, options.values)
        : entry

    if (options.components == null) return interpolated

    return _jsx(Fragment, { children: interpolateJsx(interpolated, options.components) })
  }

  return {
    formatDateTime,
    formatList,
    formatNumber,
    formatRelativeTime,
    locale,
    plural,
    sort,
    createCollator,
    t: translate,
  } as any // eslint-disable-line @typescript-eslint/no-explicit-any
}

//

function get(obj: object, keypath: TranslateKeyPath): unknown {
  /* eslint-disable no-param-reassign */
  keypath = typeof keypath === 'string' ? keypath.split('.') : keypath
  for (let i = 0; i < keypath.length; i++) {
    /* @ts-expect-error */
    obj = obj[keypath[i]]
    if (obj == null) break
  }
  /* eslint-enable no-param-reassign */
  return obj
}

//

const re = /{{(.*?)}}/g

function interpolate(str: string, values: Record<number | string, string>): string {
  return str.replace(re, (_matches, p) => {
    const value = get(values, p.trim()) as string | undefined
    if (value == null) return ''
    return value
  })
}

//

const rejsx = /<(\w+)>(.*?)<\/\1>|<(\w+)\/>/

function interpolateJsx(
  str: string,
  components: Record<string, ElementType>,
  depth = 0,
): Array<JSX.Element | string> {
  const match = rejsx.exec(str)

  if (match == null) return [str]

  const before = match.input.slice(0, match.index)
  const name = components[match[1]] ?? match[1]
  const inner = match[2]
  const after = match.input.slice(match.index + match[0].length)

  return [
    before,
    _jsx(name, { key: depth, children: interpolateJsx(inner, components, depth + 1) }),
    ...interpolateJsx(after, components, depth + 1),
  ]
}

//

/**
 * @see https://stackoverflow.com/a/58436959/6826422
 */

type Join<K, P> = K extends number | string
  ? P extends number | string
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never

type Cons<H, T> = T extends ReadonlyArray<unknown>
  ? ((h: H, ...t: T) => void) extends (...r: infer R) => void
    ? R
    : never
  : never

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

type Values<T> = T[keyof T]

type LeavesTuples<T, Depth extends number = 5> = Depth extends never
  ? never
  : T extends object
  ? T extends Array<infer Item>
    ? Cons<number, LeavesTuples<Item, Prev[Depth]>>
    : Values<{ [P in keyof T & (number | string)]-?: Cons<P, LeavesTuples<T[P], Prev[Depth]>> }>
  : []

type LeavesString<T, Depth extends number = 5> = Depth extends never
  ? never
  : T extends object
  ? T extends Array<infer Item>
    ? Join<number, LeavesString<Item, Prev[Depth]>>
    : Values<{
        [P in keyof T & (number | string)]-?: Join<P, LeavesString<T[P], Prev[Depth]>>
      }>
  : ''

type KeyPathStrings<T> = LeavesString<T>
type KeyPathTuples<T> = LeavesTuples<T>
