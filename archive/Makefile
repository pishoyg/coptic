crum_scan:
	# Download Crum's scan.
	./dictionary/marcion_sourceforge_net/download_scan.sh "/tmp/crum"
	./convert.sh "/tmp/crum" "docs/crum/crum" "-crop" "3768x5584+270+60" "+repage"

# Extract one image per PDF page, in the page range $(3)–$(4) of PDF $(1),
# convert it to monochrome, and save it under `docs/kasser/$(2)/`, named
# sequentially starting from 0.
# Before thresholding, we divide the page by an estimate of its background
# (the page with the text dilated away and blurred), to flatten uneven lighting.
# Otherwise, shadows and darker paper turn into large black areas.
# We then center the content horizontally. To find the content's bounding box,
# we downscale the page by 10x, so isolated specks fade out but text doesn't.
define kasser_scan
	set -o errexit; : "$(1)"; \
	TMP="$$(mktemp -d)"; \
	mkdir -p "docs/kasser/$(2)"; \
	for PAGE in $$(seq $(3) $(4)); do \
		PNG="docs/kasser/$(2)/$$((PAGE - $(3))).png"; \
		pdfimages -all -f "$${PAGE}" -l "$${PAGE}" "$(1)" "$${TMP}/img"; \
		magick "$${TMP}"/img-000.* \
			-strip \
			-colorspace gray \
			\( +clone -morphology Dilate Octagon:4 -blur 0x20 \) \
			-compose Divide_Src -composite \
			-threshold 75% \
			-type bilevel \
			"$${PNG}"; \
		rm "$${TMP}"/img-*; \
		set -- $$(magick "$${PNG}" -scale 10% -threshold 90% \
			-format '%w %@' info: 2>/dev/null | tr 'x+' '  '); \
		if [ "$$2" -gt 0 ]; then \
			magick "$${PNG}" \
				-strip \
				-background white \
				-extent "%[w]x%[h]+$$((($$4 - ($$1 - $$2) / 2) * 10))+0" \
				-type bilevel \
				"$${PNG}"; \
		fi; \
	done; \
	rmdir "$${TMP}"
endef

kasser_scan:
	# Convert Kasser's scans to PNG.
	# - Compléments au dictionnaire copte de Crum (IFAO, 1964).
	# - Compléments morphologiques au dictionnaire de Crum (BIFAO 64, 1966).
	# Set `KASSER_COMPLEMENTS_PDF` and `KASSER_MORPHOLOGIQUES_PDF` to the PDFs.
	$(call kasser_scan,$${KASSER_COMPLEMENTS_PDF:?},complements,7,159)
	$(call kasser_scan,$${KASSER_MORPHOLOGIQUES_PDF:?},morphologiques,2,49)
