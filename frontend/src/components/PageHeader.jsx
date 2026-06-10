// Consistent page title block: title + optional subtitle on the left, actions on
// the right. Keeps spacing/typography uniform across every page.
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div className="page-head__titles">
        <h1>{title}</h1>
        {subtitle && <p className="page-head__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  );
}
