import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BlogDirectory } from "@/components/blog/blog-directory";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { BookOnlineButton } from "@/components/ui/book-online-button";
import { blogPosts } from "@/content/blog-posts";

export const metadata: Metadata = {
  title: "Appliance Care & Repair Advice for Charlotte Homeowners",
  description: "Practical appliance care, troubleshooting, and repair guidance for Charlotte, NC homeowners from DAPL Appliance Repair.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Appliance Care & Repair Advice for Charlotte Homeowners",
    description: "Practical appliance advice from DAPL Appliance Repair.",
    url: "/blog",
    type: "website",
    images: [{ url: blogPosts[0].image, alt: blogPosts[0].imageAlt }],
  },
};

export default function BlogPage() {
  const featuredPost = blogPosts[0];
  return <div className="min-h-screen bg-background text-foreground">
    <Header logoHref="/" />
    <main>
      <section className="relative overflow-hidden bg-surface py-16 sm:py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,42,86,0.12),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(207,36,49,0.1),_transparent_34%)]" />
        <div className="container-shell relative max-w-5xl text-center"><p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">DAPL Learning Center</p><h1 className="mt-4 text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">Appliance Care &amp; Repair Advice for Charlotte Homeowners</h1><p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-muted">Practical, safety-conscious guidance for common kitchen, laundry, and cooling appliance questions—written to help you know what to check and when to schedule help.</p></div>
      </section>
      <section className="bg-background py-14 sm:py-20"><div className="container-shell"><p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Featured guide</p><article className="mt-5 grid overflow-hidden rounded-3xl border border-border bg-surface shadow-xl shadow-primary/10 lg:grid-cols-[1.1fr_0.9fr]"><div className="relative min-h-[280px]"><Image src={featuredPost.image} alt={featuredPost.imageAlt} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" /></div><div className="flex flex-col justify-center p-7 sm:p-10"><div className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{featuredPost.category} · {featuredPost.readingTime}</div><h2 className="mt-4 text-3xl font-black tracking-tight text-foreground">{featuredPost.title}</h2><p className="mt-4 leading-7 text-muted">{featuredPost.description}</p><Link href={`/blog/${featuredPost.slug}`} className="mt-7 inline-flex w-fit items-center rounded-full bg-accent px-5 py-3 text-sm font-black text-accent-foreground transition hover:brightness-95">Read the guide</Link></div></article></div></section>
      <section className="bg-[#f2f5f9] py-14 sm:py-20"><div className="container-shell"><div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Browse by topic</p><h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Useful answers before you book</h2><p className="mt-4 leading-7 text-muted">Choose a category or explore every guide. Each article links to a relevant DAPL service, brand, or local service-area page when it helps the reader take the next step.</p></div><div className="mt-8"><BlogDirectory posts={blogPosts} /></div></div></section>
      <section className="bg-primary py-16 text-primary-foreground"><div className="container-shell flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-center"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Need help now?</p><h2 className="mt-3 text-3xl font-black tracking-tight">Book local appliance repair in Charlotte.</h2><p className="mt-3 leading-7 text-white/85">If the issue is urgent, involves a leak, safety concern, or lost cooling, tell us what the appliance is doing and we will help confirm the next available option.</p></div><div className="flex flex-col gap-3 sm:flex-row"><a href="tel:+19803936588" className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-black text-accent-foreground transition hover:brightness-95">Call +1 (980) 393-6588</a><BookOnlineButton location="blog_hub_cta" className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-black text-primary-foreground transition hover:bg-white/15" /></div></div></section>
    </main><Footer />
  </div>;
}
