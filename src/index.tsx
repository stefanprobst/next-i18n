/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { assert } from '@stefanprobst/assert'
import { useRouter } from 'next/router'
import type { ElementType, ReactNode } from 'react'
import { createContext, Fragment, useContext, useMemo } from 'react'
/* @ts-expect-error */
import { jsx as _jsx } from 'react/jsx-runtime'

type DictionaryMap = object
type TranslateKeyPath = string | Array<string | number>
type TranslateOptions = {
  values?: Record<string | number, string>
  components?: Record<string, ElementType>
  count?: number
  /** locale?: string */
}

interface I18nContextValue<
  TDictionaryMap extends DictionaryMap = DictionaryMap,
  TLocale extends string = string,
> {
  formatDateTime: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string
  // formatList: (value: Array<string>, options?: Intl.ListFormatOptions) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatRelativeTime: (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
  ) => string
  locale: TLocale | undefined
  plural: (value: number, options?: Intl.PluralRulesOptions) => Intl.LDMLPluralRule
  sort: (value: Array<string>, options?: Intl.CollatorOptions) => Array<string>
  t: (
    keypath: KeyPathsArray<TDictionaryMap> | KeyPathsString<TDictionaryMap>,
    options?: TranslateOptions,
  ) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)
if (process.env['NODE_ENV'] !== 'production') {
  I18nContext.displayName = 'I18nContext'
}

export function useI18n<
  TDictionaryMap extends DictionaryMap,
  TLocale extends string,
>(): I18nContextValue<TDictionaryMap> {
  /* @ts-expect-error */
  const value = useContext<I18nContextValue<TDictionaryMap, TLocale> | null>(I18nContext)

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
    function formatDateTime(value: Date | number, options?: Intl.DateTimeFormatOptions) {
      return new Intl.DateTimeFormat(locale, options).format(value)
    }

    // function formatList(value: Array<string>, options?: Intl.ListFormatOptions) {
    //   return new Intl.ListFormat(locale, options).format(value)
    // }

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
      // formatList,
      formatNumber,
      formatRelativeTime,
      locale,
      plural,
      sort,
      t: translate,
    }
  }, [locale, dictionaries])

  return <I18nContext.Provider value={service}>{props.children}</I18nContext.Provider>
}

//

function get(obj: object, keypath: TranslateKeyPath): unknown {
  keypath = typeof keypath === 'string' ? keypath.split('.') : keypath
  for (let i = 0; i < keypath.length; i++) {
    /* @ts-expect-error */
    obj = obj[keypath[i]]
    if (obj == null) break
  }
  return obj
}

//

const re = /{{(.*?)}}/g

function interpolate(str: string, values: Record<string | number, string>): string {
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
): Array<string | JSX.Element> {
  const match = rejsx.exec(str)

  if (match == null) return [str]

  const before = match.input.slice(0, match.index)
  const name = components[match[1]] ?? match[1]
  const inner = match[2]
  const after = match.input.slice(match.index + match[0].length)

  return [
    before,
    _jsx(name, { children: interpolateJsx(inner, components) }),
    ...interpolateJsx(after, components),
  ]
}

//

type ValidKey<TObj extends object> = TObj extends ReadonlyArray<unknown> ? number : string | number

type KeyPathsString<TObj extends object> = {
  [K in keyof TObj & ValidKey<TObj>]: TObj[K] extends object
    ? /* @ts-expect-error */
      `${K}.${KeyPathsString<TObj[K]>}`
    : `${K}`
}[keyof TObj & ValidKey<TObj>]

type KeyPathsArray<TObj extends object> = [
  ...{
    [K in keyof TObj & ValidKey<TObj>]: TObj[K] extends object
      ? [K, ...KeyPathsArray<TObj[K]>]
      : [K]
  }[keyof TObj & ValidKey<TObj>]
]
