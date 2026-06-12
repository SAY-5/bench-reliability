import { Hero } from "./components/Hero";
import { TimeoutFix } from "./components/TimeoutFix";
import { PortNaming } from "./components/PortNaming";
import { Tickets } from "./components/Tickets";

export default function App() {
  return (
    <main>
      <Hero />
      <TimeoutFix />
      <PortNaming />
      <Tickets />
    </main>
  );
}
