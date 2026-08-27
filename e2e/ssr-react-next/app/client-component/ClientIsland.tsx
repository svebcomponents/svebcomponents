"use client";

export default function ClientIsland({ title }: { title: string }) {
  return (
    <div id="app">
      <sync-component title={title} count="4" enabled="" meta={{ note: "rich prop survived" }}>
        <p id="light-dom">light dom child</p>
      </sync-component>
    </div>
  );
}
