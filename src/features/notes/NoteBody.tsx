import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AppText } from '@/ui/components/Screen';
import { fontFaceFor, type as typeTokens } from '@/ui/tokens';
import { useTheme } from '@/ui/theme';
import { normalizeTitle } from './link-utils';

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'ordered'; number: string; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'paragraph'; text: string };

/**
 * Markdown-lite ayrıştırıcı. Tam bir markdown motoru değil: notların
 * gerçekte kullandığı başlık, madde, alıntı ve satır içi vurguları
 * yeterince iyi gösterir. Yeni bir bağımlılık getirmemek bilinçli.
 */
function parseBlocks(body: string): Block[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
    paragraph = [];
  };

  for (const line of lines) {
    if (/^\s*$/.test(line)) {
      flush();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const level = Math.min(heading[1].length, 3) as 1 | 2 | 3;
      blocks.push({ kind: 'heading', level, text: heading[2].trim() });
      continue;
    }

    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      flush();
      blocks.push({ kind: 'quote', text: quote[1] });
      continue;
    }

    const ordered = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    if (ordered) {
      flush();
      blocks.push({ kind: 'ordered', number: ordered[1], text: ordered[2] });
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      flush();
      blocks.push({ kind: 'bullet', text: bullet[1] });
      continue;
    }

    paragraph.push(line);
  }

  flush();
  return blocks;
}

/**
 * Not gövdesini okunur biçimde gösterir. `[[başlık]]` hedefi varsa
 * tıklanabilir; hedef yoksa soluk ve tıklanamaz — yanlışlıkla yeni not
 * açılmasını engeller.
 */
export function NoteBody({
  body,
  titleIndex,
  onOpenNote,
}: {
  body: string;
  /** normalleştirilmiş başlık → not kimliği */
  titleIndex: Map<string, string>;
  onOpenNote: (id: string) => void;
}) {
  const { c, space: sp } = useTheme();
  const blocks = useMemo(() => parseBlocks(body), [body]);

  const renderInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    const inline = /\[\[([^\]]+)\]\]|\*\*([^*]+)\*\*|`([^`]+)`/g;
    let last = 0;
    let match: RegExpExecArray | null;

    while ((match = inline.exec(text)) !== null) {
      if (match.index > last) nodes.push(text.slice(last, match.index));

      const [raw, wiki, bold, code] = match;
      if (wiki !== undefined) {
        const title = wiki.trim();
        const targetId = titleIndex.get(normalizeTitle(title));
        nodes.push(
          <Text
            key={`${match.index}-wiki`}
            onPress={targetId ? () => onOpenNote(targetId) : undefined}
            accessibilityRole={targetId ? 'link' : 'text'}
            accessibilityLabel={
              targetId ? `${title} notuna git` : `${title} — bağlantı hedefi yok`
            }
            style={{
              color: targetId ? c.accent : c.textFaint,
              textDecorationLine: 'underline',
              textDecorationStyle: targetId ? 'solid' : 'dashed',
            }}
          >
            {title}
          </Text>,
        );
      } else if (bold !== undefined) {
        nodes.push(
          <Text key={`${match.index}-bold`} style={{ fontFamily: fontFaceFor(typeTokens.bodyStrong) }}>
            {bold}
          </Text>,
        );
      } else if (code !== undefined) {
        nodes.push(
          <Text
            key={`${match.index}-code`}
            style={{
              fontFamily: codeFace,
              backgroundColor: c.surfaceRaised,
              color: c.text,
            }}
          >
            {code}
          </Text>,
        );
      }

      last = match.index + raw.length;
    }

    if (last < text.length) nodes.push(text.slice(last));
    return nodes;
  };

  if (blocks.length === 0) {
    return (
      <AppText variant="body" muted>
        Henüz içerik yok.
      </AppText>
    );
  }

  return (
    <View style={{ gap: sp.sm }}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return (
              <AppText
                key={index}
                variant={block.level === 1 ? 'title' : block.level === 2 ? 'section' : 'bodyStrong'}
                style={{ marginTop: index === 0 ? 0 : sp.xs }}
              >
                {renderInline(block.text)}
              </AppText>
            );
          case 'bullet':
            return (
              <View key={index} style={styles.row}>
                <Text style={[styles.marker, { color: c.accent }]}>•</Text>
                <AppText variant="body" style={styles.rowText}>
                  {renderInline(block.text)}
                </AppText>
              </View>
            );
          case 'ordered':
            return (
              <View key={index} style={styles.row}>
                <Text style={[styles.marker, { color: c.textMuted }]}>{block.number}.</Text>
                <AppText variant="body" style={styles.rowText}>
                  {renderInline(block.text)}
                </AppText>
              </View>
            );
          case 'quote':
            return (
              <View
                key={index}
                style={{
                  borderLeftWidth: 2,
                  borderLeftColor: c.accent,
                  paddingLeft: sp.sm,
                }}
              >
                <AppText variant="body" muted style={{ fontStyle: 'italic' }}>
                  {renderInline(block.text)}
                </AppText>
              </View>
            );
          case 'paragraph':
          default:
            return (
              <AppText key={index} variant="body">
                {renderInline(block.text)}
              </AppText>
            );
        }
      })}
    </View>
  );
}

// Kalın metin gerçek Inter dosyasından gelir; Android'de fontWeight
// sentetik kalınlık üretmez (bkz. tokens.ts).
const codeFace = Platform.select({
  web: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  default: 'monospace',
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  marker: {
    fontSize: 15,
    lineHeight: 22,
    width: 14,
  },
  rowText: {
    flex: 1,
  },
});
