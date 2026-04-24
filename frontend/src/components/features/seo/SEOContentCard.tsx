"use client";

import { useCallback } from "react";
import { Copy, Save, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SEOContentCardProps {
  originalContent: string;
  generatedContent: string | null;
  isLoading: boolean;
  onCopy: (content: string) => void;
  onSave: (content: string) => void;
  onRegenerate: () => void;
}

function ContentSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-[#404040] rounded w-3/4" />
      <div className="h-4 bg-[#404040] rounded" />
      <div className="h-4 bg-[#404040] rounded w-5/6" />
      <div className="h-4 bg-[#404040] rounded w-2/3" />
      <div className="h-4 bg-[#404040] rounded w-4/5" />
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = "outline",
  className,
  size = "sm",
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={cn("gap-1.5", className)}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

export function SEOContentCard({
  originalContent,
  generatedContent,
  isLoading,
  onCopy,
  onSave,
  onRegenerate,
}: SEOContentCardProps) {
  const handleCopyOriginal = useCallback(() => {
    onCopy(originalContent);
  }, [originalContent, onCopy]);

  const handleCopyGenerated = useCallback(() => {
    if (generatedContent) {
      onCopy(generatedContent);
    }
  }, [generatedContent, onCopy]);

  return (
    <Card className="bg-[#000000] border border-solid border-[rgba(65,65,65,0.8)] overflow-hidden">
      <CardHeader className="pb-3 border-b border-[rgba(65,65,65,0.8)] bg-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">SEO Content Comparison</h3>
          <div className="flex gap-2">
            <ActionButton
              icon={RefreshCw}
              label="Regenerate"
              onClick={onRegenerate}
              disabled={isLoading}
              variant="ghost"
              className="text-[#faff69] hover:text-[#faff69] hover:bg-[#faff69]/10"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Split View Container */}
        <div className="flex flex-col md:flex-row">
          {/* Original Content - Left Side */}
          <div className="flex-1 p-4 md:p-6 border-b md:border-b-0 md:border-r border-[rgba(65,65,65,0.8)]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-[#a0a0a0] uppercase tracking-wide">
                Original
              </h4>
              <ActionButton
                icon={Copy}
                label="Copy"
                onClick={handleCopyOriginal}
                variant="ghost"
                size="sm"
                className="text-[#a0a0a0] hover:text-white"
              />
            </div>
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                {originalContent || (
                  <span className="text-[#a0a0a0] italic">No original content provided</span>
                )}
              </p>
            </div>
          </div>

          {/* Generated Content - Right Side */}
          <div className="flex-1 p-4 md:p-6 bg-[#0a0a0a]/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-[#faff69] uppercase tracking-wide">
                Generated
              </h4>
              <div className="flex gap-2">
                <ActionButton
                  icon={Copy}
                  label="Copy"
                  onClick={handleCopyGenerated}
                  disabled={isLoading || !generatedContent}
                  variant="ghost"
                  size="sm"
                  className="text-[#a0a0a0] hover:text-white"
                />
                <ActionButton
                  icon={Save}
                  label="Save"
                  onClick={() => generatedContent && onSave(generatedContent)}
                  disabled={isLoading || !generatedContent}
                  variant="default"
                  size="sm"
                  className="bg-[#faff69] text-black hover:bg-[#faff69]/90"
                />
              </div>
            </div>

            {isLoading ? (
              <ContentSkeleton />
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {generatedContent || (
                    <span className="text-[#a0a0a0] italic">
                      Click &quot;Regenerate&quot; to generate SEO content
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
