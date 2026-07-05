import MainLayout from "../components/layout/MainLayout";
import { useSocket } from "../hooks/useSocket";

export default function App() {
  useSocket();
  return <MainLayout />;
}