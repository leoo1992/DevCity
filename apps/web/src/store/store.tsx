'use client';

import {
  configureStore,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import {
  Provider,
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from 'react-redux';
import type { ReactNode } from 'react';
import type { CityColorMode } from '@/lib/city';

interface CityUiState {
  selectedPath: string | null;
  hoveredPath: string | null;
  query: string;
  hiddenLanguages: string[];
  colorMode: CityColorMode;
}

const initialState: CityUiState = {
  selectedPath: null,
  hoveredPath: null,
  query: '',
  hiddenLanguages: [],
  colorMode: 'language',
};

const cityUiSlice = createSlice({
  name: 'cityUi',
  initialState,
  reducers: {
    selectBuilding(state, action: PayloadAction<string | null>) {
      state.selectedPath = action.payload;
    },
    hoverBuilding(state, action: PayloadAction<string | null>) {
      state.hoveredPath = action.payload;
    },
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    toggleLanguage(state, action: PayloadAction<string>) {
      const language = action.payload;
      state.hiddenLanguages = state.hiddenLanguages.includes(language)
        ? state.hiddenLanguages.filter((item) => item !== language)
        : [...state.hiddenLanguages, language];
    },
    setColorMode(state, action: PayloadAction<CityColorMode>) {
      state.colorMode = action.payload;
    },
    resetUi(state) {
      state.selectedPath = null;
      state.hoveredPath = null;
      state.query = '';
      state.hiddenLanguages = [];
    },
  },
});

export const {
  hoverBuilding,
  resetUi,
  selectBuilding,
  setColorMode,
  setQuery,
  toggleLanguage,
} = cityUiSlice.actions;

export const store = configureStore({
  reducer: {
    cityUi: cityUiSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function StoreProvider({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
