import { CopyIcon } from "@radix-ui/react-icons"
import { IconButton, Tooltip } from "@radix-ui/themes"
import type { FC } from "react"
import { copyToClipboard } from "../utils/copyToClipboard"

export const CopyButton: FC<{ prompts: string[] | undefined }> = ({ prompts }) => (
    <Tooltip
        content="Copy"
    >
        <IconButton
            size="1"
            color="gray"
            variant="ghost"
            onClick={() => prompts !== undefined && copyToClipboard(prompts.join("\n"))}
            disabled={prompts === undefined}
        >
            <CopyIcon />
        </IconButton>
    </Tooltip>
)
