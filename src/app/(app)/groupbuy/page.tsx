"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatTimestamp } from "@/lib/utils/format";

const MOCK_GROUPS = [
  {
    groupId: "gb-001",
    productName: "Nike Air Max 90",
    totalAmountHbar: "15000000000",
    perPersonAmountHbar: "5000000000",
    participantCount: 3,
    currentContributors: 1,
    status: "funding",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
];

export default function GroupBuyPage() {
  const router = useRouter();
  const groups = MOCK_GROUPS;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Group Buys
        </h1>
        <Button variant="accent" size="sm" onClick={() => router.push("/scan")}>
          New Group Buy
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="glass-card p-8 text-center space-y-4">
          <div className="text-4xl">👥</div>
          <p className="text-[var(--text-secondary)]">
            No active group buys. Start one to split costs with friends!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card
              key={group.groupId}
              hover
              className="p-4 space-y-3"
              onClick={() => router.push(`/groupbuy/${group.groupId}`)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  {group.productName}
                </h3>
                <Badge
                  variant={group.status === "funding" ? "warning" : "success"}
                  size="sm"
                >
                  {group.status}
                </Badge>
              </div>

              {/* Funding bar */}
              <div>
                <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                  <span>
                    {group.currentContributors}/{group.participantCount}{" "}
                    contributors
                  </span>
                  <span>
                    {(
                      (group.currentContributors / group.participantCount) *
                      100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-overlay)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all"
                    style={{
                      width: `${
                        (group.currentContributors / group.participantCount) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>
                  {Number(group.perPersonAmountHbar).toLocaleString()} ℏ each
                </span>
                <span>Expires {formatTimestamp(group.expiresAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
