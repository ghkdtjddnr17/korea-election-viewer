import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";

/**
 * Policy-section labels used inside §8 (선관위 공식 5대공약) and §7 (분야별):
 * `(목표) ... (방법) ... (재원) ...` are run together in the source, which is hard
 * to scan. Split each label onto its own line and bold it. Only the three
 * canonical labels are touched — sub-domain hints like `(교통)` or `(복지)` are
 * intentionally left alone so we don't mangle inline parentheticals.
 */
const POLICY_LABEL_RE = /\s\((목표|방법|재원)\)\s*/g;
function preprocessPolicyLabels(s: string): string {
  return s.replace(POLICY_LABEL_RE, "  \n**($1)** ");
}

const components: Components = {
  a({ href, children, ...rest }) {
    const isExternal = !!href && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        {...rest}
      >
        {children}
      </a>
    );
  },
  table({ children, ...rest }) {
    return (
      <div className="overflow-x-auto -mx-2 my-4">
        <table {...rest}>{children}</table>
      </div>
    );
  },
  img({ src, alt, ...rest }) {
    if (!src) return null;
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={src} alt={alt ?? ""} loading="lazy" {...rest} />;
  },
};

export default function Markdown({ source }: { source: string }) {
  return (
    <div className="article-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeRaw]}
        components={components}
      >
        {preprocessPolicyLabels(source)}
      </ReactMarkdown>
    </div>
  );
}
