// pages/index.js
import dynamic from "next/dynamic";

const MapClient = dynamic(() => import("../components/MapClient"), { ssr: false });

export default function Home() {
  return <MapClient />;
}
