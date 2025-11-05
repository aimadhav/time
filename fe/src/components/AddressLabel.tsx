import React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, shortenAddress } from "@/lib/utils";
import { useIdentity } from "@/context/IdentityContext";

interface AddressLabelProps {
  address: string;
  className?: string;
  showAddress?: boolean;
  allowManage?: boolean;
  size?: "sm" | "md";
}

export const AddressLabel: React.FC<AddressLabelProps> = ({
  address,
  className,
  showAddress = true,
  allowManage = false,
  size = "md",
}) => {
  const { identity, openEditor } = useIdentity(address);
  const hasCustomName = Boolean(identity?.name);
  const displayName = hasCustomName ? identity?.name ?? "" : shortenAddress(address);
  const secondary = showAddress && hasCustomName ? shortenAddress(address, 5, 5) : null;
  const description = identity?.description;

  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex flex-col">
        <span className={cn("font-medium", size === "sm" ? "text-sm" : "text-base")}>{displayName}</span>
        {secondary && (
          <span className="text-xs text-muted-foreground font-mono">{secondary}</span>
        )}
      </span>
      {allowManage && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={openEditor}
          className="h-7 w-7"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      )}
    </span>
  );

  if (description) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{description}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};
