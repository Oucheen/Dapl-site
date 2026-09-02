"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { blogCategories, type BlogPost } from "@/content/blog-posts";

export function BlogDirectory({ posts }: { posts: BlogPost[] }) {
  const [activeCategory, setActiveCategory] = useState<"All" | (typeof blogCategories)[number]>("All");
  const visiblePosts = useMemo(() => activeCategory === "All" ? posts : posts.filter((post) => post.category === activeCategory), [activeCategory, posts]);
  return <>
    <div className="flex snap-x gap-2 overflow-x-auto pb-2" aria-label="Article categories">
      {["All", ...blogCategories].map((category) => <button key={category} type="button" onClick={() => setActiveCategory(category as typeof activeCategory)} className={`snap-start whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition ${activeCategory === category ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground hover:border-primary/30 hover:text-primary"}`}>{category}</button>)}
    </div>
    <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {visiblePosts.map((post) => <article key={post.slug} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/10">
        <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/9] overflow-hidden"><Image src={post.image} alt={post.imageAlt} fill sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" /></Link>
        <div className="flex flex-1 flex-col p-6"><div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-[0.16em] text-primary"><span>{post.category}</span><span className="text-muted">{post.readingTime}</span></div><h2 className="mt-3 text-xl font-black tracking-tight text-foreground"><Link href={`/blog/${post.slug}`} className="transition hover:text-primary">{post.title}</Link></h2><p className="mt-3 text-sm leading-7 text-muted">{post.description}</p><Link href={`/blog/${post.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary">Read article <span aria-hidden>→</span></Link></div>
      </article>)}
    </div>
  </>;
}
