import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";

describe("UI primitives", () => {
  it("renders a primary button", () => {
    const html = renderToStaticMarkup(<Button>Save</Button>);

    expect(html).toContain('type="button"');
    expect(html).toContain("ui-button-primary");
    expect(html).toContain("Save");
  });

  it("renders a badge variant", () => {
    const html = renderToStaticMarkup(<Badge variant="success">Applied</Badge>);

    expect(html).toContain("ui-badge-success");
    expect(html).toContain("Applied");
  });

  it("renders an empty state with its action", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="No applications"
        description="Create your first application."
        action={<Button>Create application</Button>}
      />,
    );

    expect(html).toContain("No applications");
    expect(html).toContain("Create your first application.");
    expect(html).toContain("Create application");
  });

  it("renders an error state with alert semantics", () => {
    const html = renderToStaticMarkup(
      <ErrorState description="Unable to load applications." />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Unable to load applications.");
  });

  it("renders a loading state with status semantics", () => {
    const html = renderToStaticMarkup(<LoadingState />);

    expect(html).toContain('role="status"');
    expect(html).toContain("Loading...");
  });
});
