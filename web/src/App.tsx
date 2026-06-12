import { Hero } from "./components/Hero";
import { TimeoutFix } from "./components/TimeoutFix";
import { PortNaming } from "./components/PortNaming";

export default function App() {
  return (
    <main>
      <Hero />
      <TimeoutFix />
      <PortNaming />
    </main>
  );
}
