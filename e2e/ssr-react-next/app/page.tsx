import Link from "next/link";

export default function Home() {
  return (
    <main>
      <p id="home">svebcomponents next e2e</p>
      <Link id="to-rsc-async" href="/rsc-async">
        RSC async
      </Link>
    </main>
  );
}
