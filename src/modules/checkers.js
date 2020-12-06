import { effectTypes } from '@redux-saga/core/effects'
import * as is from '@redux-saga/is'

export const isRaceEffect = eff =>
  is.effect(eff) && eff.type === effectTypes.RACE
