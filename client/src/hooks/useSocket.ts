import { useEffect } from "react";
import { getSocket } from "../services/socket";

export const useSocket = () => {
  useEffect(() => {
    // Initialize socket connection on mount
    getSocket();
  }, []);
};
