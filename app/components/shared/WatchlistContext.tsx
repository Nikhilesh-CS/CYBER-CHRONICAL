"use client";

import { createContext } from "react";
import type { StackProduct } from "../../../lib/watchlist";

export const WatchlistContext = createContext<StackProduct[]>([]);
