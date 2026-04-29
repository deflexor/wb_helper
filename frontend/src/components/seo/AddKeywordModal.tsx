'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMarketplace } from '@/components/MarketplaceProvider';
import { useSeoKeywords } from '@/hooks/useSeoKeywords';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddKeywordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddKeywordModal({ open, onOpenChange }: AddKeywordModalProps) {
  const { t } = useTranslation();
  const { marketplace } = useMarketplace();
  const { addKeyword } = useSeoKeywords({ marketplace });

  const [keyword, setKeyword] = useState('');
  const [articleId, setArticleId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!keyword.trim() || !articleId.trim()) return;

    setIsSubmitting(true);
    try {
      await addKeyword(keyword.trim(), articleId.trim());
      window.alert(t('seo.dashboard.keywordAdded'));
      setKeyword('');
      setArticleId('');
      onOpenChange(false);
    } catch {
      window.alert(t('seo.dashboard.keywordAddError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [keyword, articleId, addKeyword, t, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('seo.dashboard.addKeyword')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Input
              placeholder={t('seo.dashboard.keywordPlaceholder')}
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); }}
            />
          </div>
          <div className="grid gap-2">
            <Input
              placeholder={t('seo.dashboard.articleIdPlaceholder')}
              value={articleId}
              onChange={(e) => { setArticleId(e.target.value); }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => { void handleSubmit(); }}
            disabled={!keyword.trim() || !articleId.trim() || isSubmitting}
          >
            {isSubmitting ? t('common.adding') : t('common.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}