$path = 'F:/coding/SPBBOATS/packages/backend/src/admin/admin-articles.controller.ts'
$lines = Get-Content -LiteralPath $path

function Find-LineIndex([string[]]$arr, [string]$contains, [int]$from=0) {
  for ($i=$from; $i -lt $arr.Count; $i++) {
    if ($arr[$i] -like ('*' + $contains + '*')) { return $i }
  }
  return -1
}

# --- create(): replace legacy link block ---
$start = Find-LineIndex $lines '// New M2M links (best-effort, additive; legacy arrays remain source-of-truth if UI not migrated)'
if ($start -lt 0) { throw 'Create links block start not found' }
$endReturn = Find-LineIndex $lines 'return this.get(created.id);' $start
if ($endReturn -lt 0) { throw 'Create return line not found' }
$end = $endReturn - 1

$newBlock = @(
'    // New M2M links.',
'    // Dual-write bridge: if UI still sends legacy relatedLandingIds/relatedCollectionIds, mirror them into link tables',
'    // (keeping legacy arrays for backwards compatibility).',
'    const landingLinksEffective =',
'      landingLinks ?? (relatedLandingIds ? relatedLandingIds.map((landingId, i) => ({ landingId, position: i, priority: 0 })) : undefined);',
'    const collectionLinksEffective =',
'      collectionLinks ?? (relatedCollectionIds ? relatedCollectionIds.map((collectionId, i) => ({ collectionId, position: i, priority: 0 })) : undefined);',
'',
'    if (landingLinksEffective?.length) {',
'      await this.prisma.articleLandingLink.createMany({',
'        data: landingLinksEffective.map((l) => ({',
'          articleId: created.id,',
'          landingId: l.landingId,',
'          position: l.position ?? 0,',
'          priority: l.priority ?? 0,',
'        })),',
'        skipDuplicates: true,',
'      });',
'    }',
'    if (collectionLinksEffective?.length) {',
'      await this.prisma.articleCollectionLink.createMany({',
'        data: collectionLinksEffective.map((l) => ({',
'          articleId: created.id,',
'          collectionId: l.collectionId,',
'          position: l.position ?? 0,',
'          priority: l.priority ?? 0,',
'        })),',
'        skipDuplicates: true,',
'      });',
'    }'
)

$lines = @($lines[0..($start-1)] + $newBlock + $lines[($end+1)..($lines.Count-1)])

# --- update(): destructure add legacy arrays ---
$uIdx = Find-LineIndex $lines 'async update(@Param' 0
if ($uIdx -lt 0) { throw 'Update method not found' }

for ($i=$uIdx; $i -lt [Math]::Min($lines.Count, $uIdx + 120); $i++) {
  if ($lines[$i] -match '^\s*collectionLinks,\s*$') {
    if ($lines[$i+1] -notmatch '^\s*relatedLandingIds,\s*$') {
      $lines = @($lines[0..$i] + @('      relatedLandingIds,', '      relatedCollectionIds,') + $lines[($i+1)..($lines.Count-1)])
    }
    break
  }
}

for ($i=$uIdx; $i -lt [Math]::Min($lines.Count, $uIdx + 180); $i++) {
  if ($lines[$i] -match '^\s*collectionLinks\?:\s*Array<\{ collectionId: string; position\?: number; priority\?: number \}>;\s*$') {
    if ($lines[$i+1] -notmatch '^\s*relatedLandingIds\?:\s*string\[\];\s*$') {
      $lines = @($lines[0..$i] + @('      relatedLandingIds?: string[];', '      relatedCollectionIds?: string[];') + $lines[($i+1)..($lines.Count-1)])
    }
    break
  }
}

# Replace wantsRewriteLinks (and its comment line above it)
$wIdx = Find-LineIndex $lines 'const wantsRewriteLinks = landingLinks !== undefined || collectionLinks !== undefined;' 0
if ($wIdx -lt 0) { throw 'wantsRewriteLinks line not found' }
$wCommentIdx = $wIdx - 1
if ($lines[$wCommentIdx] -notlike '*// If new link payload provided, rewrite link tables transactionally*') {
  $wCommentIdx = $wIdx
}
$indent = ($lines[$wIdx] -replace '(const wantsRewriteLinks.*)$', '')

$replacement = @(
"${indent}// If new link payload provided, rewrite link tables transactionally.",
"${indent}// Dual-write bridge: if UI sends legacy relatedLandingIds/relatedCollectionIds but not structured links,",
"${indent}// we treat legacy arrays as an ordering hint and mirror them into link tables.",
"${indent}const landingLinksEffective =",
"${indent}  landingLinks ?? (relatedLandingIds ? relatedLandingIds.map((landingId, i) => ({ landingId, position: i, priority: 0 })) : undefined);",
"${indent}const collectionLinksEffective =",
"${indent}  collectionLinks ?? (relatedCollectionIds ? relatedCollectionIds.map((collectionId, i) => ({ collectionId, position: i, priority: 0 })) : undefined);",
"${indent}const wantsRewriteLinks = landingLinksEffective !== undefined || collectionLinksEffective !== undefined;"
)

$lines = @($lines[0..($wCommentIdx-1)] + $replacement + $lines[($wIdx+1)..($lines.Count-1)])

# Swap transaction usage to effective vars
for ($i=0; $i -lt $lines.Count; $i++) {
  $lines[$i] = $lines[$i].Replace('if (landingLinks !== undefined) {', 'if (landingLinksEffective !== undefined) {')
  $lines[$i] = $lines[$i].Replace('if (landingLinks.length) {', 'if (landingLinksEffective.length) {')
  $lines[$i] = $lines[$i].Replace('data: landingLinks.map((l) => ({', 'data: landingLinksEffective.map((l) => ({')
  $lines[$i] = $lines[$i].Replace('if (collectionLinks !== undefined) {', 'if (collectionLinksEffective !== undefined) {')
  $lines[$i] = $lines[$i].Replace('if (collectionLinks.length) {', 'if (collectionLinksEffective.length) {')
  $lines[$i] = $lines[$i].Replace('data: collectionLinks.map((l) => ({', 'data: collectionLinksEffective.map((l) => ({')
}

Set-Content -LiteralPath $path -Value $lines -Encoding UTF8
Write-Host 'Patched admin-articles.controller.ts OK'
