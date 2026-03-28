package domain

// OrderItem is a single line in an order request.
type OrderItem struct {
	ProductID string `json:"productId" binding:"required"`
	Quantity  int    `json:"quantity"  binding:"required,min=1"`
}

// OrderRequest is the JSON body accepted by POST /api/order.
type OrderRequest struct {
	Items      []OrderItem `json:"items"      binding:"required,min=1,dive"`
	CouponCode string      `json:"couponCode"`
}

// Order is the persisted order returned to the caller.
type Order struct {
	ID       string      `json:"id"`
	Items    []OrderItem `json:"items"`
	Products []Product   `json:"products"`
	Discount *float64    `json:"discount,omitempty"`
	Total    float64     `json:"total"`
}
