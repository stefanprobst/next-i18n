import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'
import { RouterContext } from 'next/dist/shared/lib/router-context'
import type { NextRouter } from 'next/router'
import type { FC, ReactNode } from 'react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react'

import { I18nProvider, useI18n } from '../src'

const defaultLocale = 'en'

function createWrapper(dict: object, locale = defaultLocale): FC {
  const mockRouter = { locale } as NextRouter

  return function Wrapper(props) {
    return (
      <RouterContext.Provider value={mockRouter}>
        <I18nProvider dictionaries={dict}>{props.children}</I18nProvider>
      </RouterContext.Provider>
    )
  }
}

it('retrieves translation by string key', () => {
  const dict = { common: { hello: 'Hello' } }

  function App() {
    const { t } = useI18n<typeof dict, typeof defaultLocale>()

    return <h1>{t('common.hello')}</h1>
  }

  render(<App />, { wrapper: createWrapper(dict) })

  expect(screen.getByRole('heading')).toHaveTextContent('Hello')
})

it('retrieves translation by array key', () => {
  const dict = { common: { hello: 'Hello' } }

  function App() {
    const { t } = useI18n<typeof dict, typeof defaultLocale>()

    return <h1>{t(['common', 'hello'])}</h1>
  }

  render(<App />, { wrapper: createWrapper(dict) })

  expect(screen.getByRole('heading')).toHaveTextContent('Hello')
})

it('substitutes value', () => {
  const dict = { common: { hello: 'Hello {{name}}' } }

  function App() {
    const { t } = useI18n<typeof dict, typeof defaultLocale>()

    return <h1>{t(['common', 'hello'], { values: { name: 'Stefan' } })}</h1>
  }

  render(<App />, { wrapper: createWrapper(dict) })

  expect(screen.getByRole('heading')).toHaveTextContent('Hello Stefan')
})

it('uses plural', () => {
  const dict = {
    common: {
      birds: {
        '0': 'No birds',
        zero: '',
        one: 'One bird',
        two: '',
        few: '',
        many: '',
        other: 'Many birds',
      },
    },
  }
  function App() {
    const { t, plural } = useI18n<typeof dict, typeof defaultLocale>()

    return (
      <main>
        <h1>{t(['common', 'birds', plural(2)])}</h1>
        <button>{t(['common', 'birds', plural(1)])}</button>
        <ul>
          <li>{t(['common', 'birds', '0'])}</li>
        </ul>
      </main>
    )
  }

  render(<App />, { wrapper: createWrapper(dict) })

  expect(screen.getByRole('heading')).toHaveTextContent('Many birds')
  expect(screen.getByRole('button')).toHaveTextContent('One bird')
  expect(screen.getByRole('list')).toHaveTextContent('No birds')
})

it('substitutes component', () => {
  const dict = { common: { hello: 'Hello <s>{{name}}</s>' } }

  function App() {
    const { t } = useI18n<typeof dict, typeof defaultLocale>()

    return (
      <h1>{t(['common', 'hello'], { values: { name: 'Stefan' }, components: { s: 'button' } })}</h1>
    )
  }

  render(<App />, { wrapper: createWrapper(dict) })

  expect(screen.getByRole('heading')).toHaveTextContent('Hello Stefan')
  expect(screen.getByRole('button')).toHaveTextContent('Stefan')
})

it('substitutes JSX component', () => {
  const dict = { common: { hello: 'Hello <s>{{name}}</s>' } }

  function Button(props: { children: ReactNode }) {
    /* eslint-disable-next-line testing-library/no-node-access */
    return <button className="primary">{props.children}</button>
  }

  function App() {
    const { t } = useI18n<typeof dict, typeof defaultLocale>()

    return (
      <h1>{t(['common', 'hello'], { values: { name: 'Stefan' }, components: { s: Button } })}</h1>
    )
  }

  render(<App />, { wrapper: createWrapper(dict) })

  expect(screen.getByRole('heading')).toHaveTextContent('Hello Stefan')
  expect(screen.getByRole('button')).toHaveTextContent('Stefan')
  expect(screen.getByRole('button')).toHaveClass('primary')
})

it('sorts array', () => {
  const dict = {}

  function App() {
    const { sort } = useI18n<typeof dict, typeof defaultLocale>()
    const list = ['z', 'a', 'ä']

    return (
      <ul>
        {sort(list).map((item) => {
          return <li key={item}>{item}</li>
        })}
      </ul>
    )
  }

  render(<App />, { wrapper: createWrapper(dict) })

  expect(screen.getByRole('list')).toMatchInlineSnapshot(`
    <ul>
      <li>
        a
      </li>
      <li>
        ä
      </li>
      <li>
        z
      </li>
    </ul>
  `)
})

it('sorts array according to non-default language', () => {
  const dict = {}

  function App() {
    const { sort } = useI18n<typeof dict, typeof defaultLocale>()
    const list = ['z', 'a', 'ä']

    return (
      <ul>
        {sort(list).map((item) => {
          return <li key={item}>{item}</li>
        })}
      </ul>
    )
  }

  render(<App />, { wrapper: createWrapper(dict, 'sv') })

  expect(screen.getByRole('list')).toMatchInlineSnapshot(`
    <ul>
      <li>
        a
      </li>
      <li>
        z
      </li>
      <li>
        ä
      </li>
    </ul>
  `)
})

it('sorts array of objects', () => {
  const dict = {}

  function App() {
    const { createCollator } = useI18n<typeof dict, typeof defaultLocale>()
    const compare = createCollator()
    const list = [
      { id: 1, label: 'z' },
      { id: 2, label: 'a' },
      { id: 3, label: 'ä' },
    ]

    return (
      <ul>
        {list
          .sort((a, b) => {
            return compare(a.label, b.label)
          })
          .map((item) => {
            return <li key={item.id}>{item.label}</li>
          })}
      </ul>
    )
  }

  render(<App />, { wrapper: createWrapper(dict) })

  expect(screen.getByRole('list')).toMatchInlineSnapshot(`
    <ul>
      <li>
        a
      </li>
      <li>
        ä
      </li>
      <li>
        z
      </li>
    </ul>
  `)
})
it('sorts array of objects according to non-default language', () => {
  const dict = {}

  function App() {
    const { createCollator } = useI18n<typeof dict, typeof defaultLocale>()
    const compare = createCollator()
    const list = [
      { id: 1, label: 'z' },
      { id: 2, label: 'a' },
      { id: 3, label: 'ä' },
    ]

    return (
      <ul>
        {list
          .sort((a, b) => {
            return compare(a.label, b.label)
          })
          .map((item) => {
            return <li key={item.id}>{item.label}</li>
          })}
      </ul>
    )
  }

  render(<App />, { wrapper: createWrapper(dict, 'sv') })

  expect(screen.getByRole('list')).toMatchInlineSnapshot(`
    <ul>
      <li>
        a
      </li>
      <li>
        z
      </li>
      <li>
        ä
      </li>
    </ul>
  `)
})
