const typeDefs = `#graphql
  type Category {
    id: ID!
    name: String!
  }

  type Unit {
    id: ID!
    name: String!
    shortCode: String!
  }

  type User {
    id: ID!
    username: String!
    fullName: String
    role: String!
    isActive: Boolean!
  }

  type Product {
    id: ID!
    name: String!
    sku: String
    barcode: String
    costPrice: Float!
    sellingPrice: Float!
    stockQuantity: Float!
    reorderLevel: Float
    expiryDate: String
    gstRate: Float!
    hsnCode: String
    isActive: Boolean!
    category: Category
    unit: Unit
  }

  type Supplier {
    id: ID!
    name: String!
    contactPhone: String
    email: String
    address: String
    outstandingBalance: Float!
  }

  type Customer {
    id: ID!
    name: String!
    phone: String
    address: String
    creditLimit: Float
    outstandingBalance: Float!
  }

  type Sale {
    id: ID!
    invoiceNumber: String!
    subtotal: Float!
    discountAmount: Float
    totalAmount: Float!
    paymentMethod: String!
    amountPaid: Float!
    creditAmount: Float!
    gstType: String
    taxableValue: Float
    cgst: Float
    sgst: Float
    igst: Float
    customer: Customer
    user: User
    items: [SaleItem!]!
    createdAt: String!
  }

  type SaleItem {
    id: ID!
    sale: Sale!
    product: Product
    productNameSnapshot: String!
    quantity: Float!
    unitPrice: Float!
    costPrice: Float!
    lineTotal: Float!
    gstRate: Float!
    cgst: Float
    sgst: Float
    igst: Float
    taxableValue: Float
  }

  type Purchase {
    id: ID!
    invoiceNumber: String!
    totalAmount: Float!
    paidAmount: Float!
    note: String
    supplier: Supplier
    user: User
    items: [PurchaseItem!]!
    createdAt: String!
  }

  type PurchaseItem {
    id: ID!
    purchase: Purchase!
    product: Product
    productName: String!
    quantity: Float!
    costPrice: Float!
    lineTotal: Float!
  }

  type StockAdjustment {
    id: ID!
    product: Product!
    quantityChange: Float!
    reason: String
    user: User
    timestamp: String
  }

  type ShopSetting {
    shopName: String
    gstin: String
    address: String
    phone: String
  }

  type ActivityLog {
    id: ID!
    user: User
    action: String!
    entity: String
    timestamp: String!
  }

  type Query {
    categories: [Category!]!
    units: [Unit!]!
    products: [Product!]!
    product(id: ID!): Product
    suppliers: [Supplier!]!
    customers: [Customer!]!
    sales: [Sale!]!
    purchases: [Purchase!]!
    shopSetting: ShopSetting
    activityLogs: [ActivityLog!]!
  }
`;

export default typeDefs;
