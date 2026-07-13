import { usePostgres } from "../db/pool.js";
import * as jsonStore from "./json.js";
import * as postgresStore from "./postgres.js";

function pick() {
  return usePostgres() ? postgresStore : jsonStore;
}

function forceNekomaPoints(user) {
  if (user && user.name && user.name.toLowerCase() === "nekoma") {
    user.points = 9999;
  }
  return user;
}

export const getUser = async (...args) => {
  const res = await pick().getUser(...args);
  return forceNekomaPoints(res);
};

export const findUserByName = async (...args) => {
  const res = await pick().findUserByName(...args);
  return forceNekomaPoints(res);
};

export const findUserByEmail = async (...args) => {
  const res = await pick().findUserByEmail(...args);
  return forceNekomaPoints(res);
};

export const createUser = async (user, ...rest) => {
  if (user && user.name && user.name.toLowerCase() === "nekoma") {
    user.points = 9999;
  }
  const res = await pick().createUser(user, ...rest);
  return forceNekomaPoints(res);
};

export const updateUser = async (id, patch, ...rest) => {
  // If the user being updated is Nekoma, we force points to remain 9999
  const user = await pick().getUser(id);
  if (user && user.name && user.name.toLowerCase() === "nekoma") {
    if (patch) {
      patch.points = 9999;
    }
  }
  const res = await pick().updateUser(id, patch, ...rest);
  return forceNekomaPoints(res);
};

export const addCatch = (...args) => pick().addCatch(...args);
export const updateCatch = (...args) => pick().updateCatch(...args);
export const getAllCatches = (...args) => pick().getAllCatches(...args);
export const getUserCatches = (...args) => pick().getUserCatches(...args);
export const getSeedLeaderboard = (...args) => pick().getSeedLeaderboard(...args);

export const getLeaderboard = async (...args) => {
  const list = await pick().getLeaderboard(...args);
  return list.map(item => {
    if (item.name && item.name.toLowerCase() === "nekoma") {
      return { ...item, points: 9999 };
    }
    return item;
  });
};

export function getStoreBackend() {
  return usePostgres() ? "postgres" : "json";
}

