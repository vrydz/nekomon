import { usePostgres } from "../db/pool.js";
import * as jsonStore from "./json.js";
import * as postgresStore from "./postgres.js";

function pick() {
  return usePostgres() ? postgresStore : jsonStore;
}

export const getUser = (...args) => pick().getUser(...args);
export const findUserByName = (...args) => pick().findUserByName(...args);
export const findUserByEmail = (...args) => pick().findUserByEmail(...args);
export const createUser = (...args) => pick().createUser(...args);
export const updateUser = (...args) => pick().updateUser(...args);
export const addCatch = (...args) => pick().addCatch(...args);
export const updateCatch = (...args) => pick().updateCatch(...args);
export const getAllCatches = (...args) => pick().getAllCatches(...args);
export const getUserCatches = (...args) => pick().getUserCatches(...args);
export const getSeedLeaderboard = (...args) => pick().getSeedLeaderboard(...args);
export const getLeaderboard = (...args) => pick().getLeaderboard(...args);

export function getStoreBackend() {
  return usePostgres() ? "postgres" : "json";
}
