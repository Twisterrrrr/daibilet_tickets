$path = 'F:/coding/SPBBOATS/packages/backend/src/admin/admin-articles.controller.ts'
$txt = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)

# Insert effective links constants right after marker comment in create()
$pattern = '(?m)^(\s*// New M2M links \(best-effort, additive; legacy arrays remain source-of-truth if UI not migrated\)\s*)$'
$replacement = '$1' + [Environment]::NewLine +
'    const landingLinksEffective = landingLinks ?? (relatedLandingIds ? relatedLandingIds.map((landingId, i) => ({ landingId, position: i, priority: 0 })) : undefined);' + [Environment]::NewLine +
'    const collectionLinksEffective = collectionLinks ?? (relatedCollectionIds ? relatedCollectionIds.map((collectionId, i) => ({ collectionId, position: i, priority: 0 })) : undefined);' + [Environment]::NewLine
if ($txt -notmatch $pattern) { throw 'Create links marker not found.' }
$txt = [Regex]::Replace($txt, $pattern, $replacement, [Text.RegularExpressions.RegexOptions]::Multiline)

# Switch create() to use *Effective variables
$txt = $txt.Replace('    if (landingLinks?.length) {', '    if (landingLinksEffective?.length) {')
$txt = $txt.Replace('        data: landingLinks.map((l) => ({', '        data: landingLinksEffective.map((l) => ({')
$txt = $txt.Replace('    if (collectionLinks?.length) {', '    if (collectionLinksEffective?.length) {')
$txt = $txt.Replace('        data: collectionLinks.map((l) => ({', '        data: collectionLinksEffective.map((l) => ({')

# Update(): add relatedLandingIds/relatedCollectionIds to destructuring + type
$old2 = "      landingLinks,`r`n      collectionLinks,`r`n      ...clean`r`n    } = data as UpdateArticleDto & {"
$new2 = "      landingLinks,`r`n      collectionLinks,`r`n      relatedLandingIds,`r`n      relatedCollectionIds,`r`n      ...clean`r`n    } = data as UpdateArticleDto & {"
if ($txt -notlike ('*' + $old2 + '*')) {
  # fallback for LF-only
  $old2 = "      landingLinks,`n      collectionLinks,`n      ...clean`n    } = data as UpdateArticleDto & {"
  $new2 = "      landingLinks,`n      collectionLinks,`n      relatedLandingIds,`n      relatedCollectionIds,`n      ...clean`n    } = data as UpdateArticleDto & {"
}
if ($txt -notlike ('*' + $old2 + '*')) { throw 'Update destructure block not found.' }
$txt = $txt.Replace($old2, $new2)

$old3 = "      landingLinks?: Array<{ landingId: string; position?: number; priority?: number }>;`r`n      collectionLinks?: Array<{ collectionId: string; position?: number; priority?: number }>;`r`n    };"
$new3 = "      landingLinks?: Array<{ landingId: string; position?: number; priority?: number }>;`r`n      collectionLinks?: Array<{ collectionId: string; position?: number; priority?: number }>;`r`n      relatedLandingIds?: string[];`r`n      relatedCollectionIds?: string[];`r`n    };"
if ($txt -notlike ('*' + $old3 + '*')) {
  $old3 = "      landingLinks?: Array<{ landingId: string; position?: number; priority?: number }>;`n      collectionLinks?: Array<{ collectionId: string; position?: number; priority?: number }>;`n    };"
  $new3 = "      landingLinks?: Array<{ landingId: string; position?: number; priority?: number }>;`n      collectionLinks?: Array<{ collectionId: string; position?: number; priority?: number }>;`n      relatedLandingIds?: string[];`n      relatedCollectionIds?: string[];`n    };"
}
if ($txt -notlike ('*' + $old3 + '*')) { throw 'Update cast type block not found.' }
$txt = $txt.Replace($old3, $new3)

# Update wantsRewriteLinks section
$old4 = '    // If new link payload provided, rewrite link tables transactionally (additive evolution; legacy arrays not removed)' + [Environment]::NewLine +
        '    const wantsRewriteLinks = landingLinks !== undefined || collectionLinks !== undefined;' + [Environment]::NewLine
if ($txt -notlike ('*' + $old4 + '*')) { throw 'Update wantsRewriteLinks block not found.' }
$new4 = '    // If new link payload provided, rewrite link tables transactionally.' + [Environment]::NewLine +
        '    // Dual-write bridge: if UI sends legacy relatedLandingIds/relatedCollectionIds but not structured links,' + [Environment]::NewLine +
        '    // we treat legacy arrays as an ordering hint and mirror them into link tables.' + [Environment]::NewLine +
        '    const landingLinksEffective = landingLinks ?? (relatedLandingIds ? relatedLandingIds.map((landingId, i) => ({ landingId, position: i, priority: 0 })) : undefined);' + [Environment]::NewLine +
        '    const collectionLinksEffective = collectionLinks ?? (relatedCollectionIds ? relatedCollectionIds.map((collectionId, i) => ({ collectionId, position: i, priority: 0 })) : undefined);' + [Environment]::NewLine +
        '    const wantsRewriteLinks = landingLinksEffective !== undefined || collectionLinksEffective !== undefined;' + [Environment]::NewLine
$txt = $txt.Replace($old4, $new4)

# Swap transaction to use effective vars
$txt = $txt.Replace('        if (landingLinks !== undefined) {', '        if (landingLinksEffective !== undefined) {')
$txt = $txt.Replace('          if (landingLinks.length) {', '          if (landingLinksEffective.length) {')
$txt = $txt.Replace('              data: landingLinks.map((l) => ({', '              data: landingLinksEffective.map((l) => ({')
$txt = $txt.Replace('        if (collectionLinks !== undefined) {', '        if (collectionLinksEffective !== undefined) {')
$txt = $txt.Replace('          if (collectionLinks.length) {', '          if (collectionLinksEffective.length) {')
$txt = $txt.Replace('              data: collectionLinks.map((l) => ({', '              data: collectionLinksEffective.map((l) => ({')

[IO.File]::WriteAllText($path, $txt, [Text.Encoding]::UTF8)
Write-Host 'Patched admin-articles.controller.ts OK'
