package domain

// ProductImage holds URLs for the product image in various sizes.
type ProductImage struct {
	Thumbnail string `json:"thumbnail"`
	Mobile    string `json:"mobile"`
	Tablet    string `json:"tablet"`
	Desktop   string `json:"desktop"`
}

// Product represents a food item available for ordering.
type Product struct {
	ID       string        `json:"id"`
	Name     string        `json:"name"`
	Category string        `json:"category"`
	Price    float64       `json:"price"`
	Image    *ProductImage `json:"image,omitempty"`
}
