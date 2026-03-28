// Package assets embeds static data files used by the application.
package assets

import _ "embed"

//go:embed products.json
var ProductsJSON []byte
