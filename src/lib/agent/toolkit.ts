import { HederaAIToolkit } from "@hashgraph/hedera-agent-kit-ai-sdk";
import {
  coreAccountQueryPlugin,
  coreConsensusPlugin,
} from "@hashgraph/hedera-agent-kit/plugins";
import { AgentMode } from "@hashgraph/hedera-agent-kit";
import { createAgentClient, getAgentMode } from "./agent-config";
import { createCommercePlugin } from "./plugins/commerce";
import type { AgentSessionContext } from "./types";

export function createCommerceToolkit(session: AgentSessionContext): HederaAIToolkit {
  const client = createAgentClient();
  const commercePlugin = createCommercePlugin(session);

  return new HederaAIToolkit({
    client,
    configuration: {
      plugins: [coreAccountQueryPlugin, coreConsensusPlugin, commercePlugin],
      context: {
        mode: getAgentMode(),
        accountId: session.accountId,
      },
    },
  });
}

export { AgentMode };
