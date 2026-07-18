let activeSocketId = "";

export const setSessionSocketId = (id: string) => {
  activeSocketId = id;
};

export const getSessionSocketId = (): string => {
  return activeSocketId;
};
