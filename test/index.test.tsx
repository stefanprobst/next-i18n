import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'
import { RouterContext } from 'next/dist/shared/lib/router-context'
import type { NextRouter } from 'next/router'
import type { ReactNode } from 'react'

import { I18nProvider, useI18n } from '../src'

const locale = 'en'

function createWrapper(dict: object) {
  const mockRouter = {
    locale,
  } as NextRouter

  return function Wrapper(props: { children: ReactNode }) {
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
    const { t } = useI18n<typeof dict, typeof locale>()

    return <h1>{t('common.hello')}</h1>
  }

  render(<App />, { wrapper: createWrapper(dict) })

  expect(screen.getByRole('heading')).toHaveTextContent('Hello')
})

it('retrieves translation by array key', () => {
  const dict = { common: { hello: 'Hello' } }

  function App() {
    const { t } = useI18n<typeof dict, typeof locale>()

    return <h1>{t(['common', 'hello'])}</h1>
  }

  render(<App />, { wrapper: createWrapper(dict) })

  expect(screen.getByRole('heading')).toHaveTextContent('Hello')
})

it('substitutes value', () => {
  const dict = { common: { hello: 'Hello {{name}}' } }

  function App() {
    const { t } = useI18n<typeof dict, typeof locale>()

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
    const { t, plural } = useI18n<typeof dict, typeof locale>()

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
    const { t } = useI18n<typeof dict, typeof locale>()

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
    return <button className="primary">{props.children}</button>
  }

  function App() {
    const { t } = useI18n<typeof dict, typeof locale>()

    return (
      <h1>{t(['common', 'hello'], { values: { name: 'Stefan' }, components: { s: Button } })}</h1>
    )
  }

  render(<App />, { wrapper: createWrapper(dict) })

  expect(screen.getByRole('heading')).toHaveTextContent('Hello Stefan')
  expect(screen.getByRole('button')).toHaveTextContent('Stefan')
  expect(screen.getByRole('button')).toHaveClass('primary')
})
