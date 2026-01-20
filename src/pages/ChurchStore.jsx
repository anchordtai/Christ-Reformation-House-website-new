import { useState } from 'react'
import { ShoppingCart, Plus, Minus, Search } from 'lucide-react'

const ChurchStore = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState([])

  // Sample products - in production, fetch from API
  const products = [
    {
      id: 1,
      name: 'Church T-Shirt',
      price: 25.99,
      image: '/assets/img/portfolio/portfolio-1.jpg',
      category: 'Apparel',
      description: 'Comfortable cotton t-shirt with church logo.',
    },
    {
      id: 2,
      name: 'Study Bible',
      price: 49.99,
      image: '/assets/img/bible.jpeg',
      category: 'Books',
      description: 'Comprehensive study Bible with commentary and notes.',
    },
    {
      id: 3,
      name: 'Worship CD',
      price: 15.99,
      image: '/assets/img/portfolio/portfolio-2.jpg',
      category: 'Media',
      description: 'Collection of our favorite worship songs.',
    },
    {
      id: 4,
      name: 'Devotional Book',
      price: 19.99,
      image: '/assets/img/portfolio/portfolio-3.jpg',
      category: 'Books',
      description: '365 daily devotionals to strengthen your faith.',
    },
    {
      id: 5,
      name: 'Church Hoodie',
      price: 45.99,
      image: '/assets/img/portfolio/portfolio-4.jpg',
      category: 'Apparel',
      description: 'Warm and cozy hoodie perfect for any season.',
    },
    {
      id: 6,
      name: 'Prayer Journal',
      price: 12.99,
      image: '/assets/img/portfolio/portfolio-5.jpg',
      category: 'Accessories',
      description: 'Beautiful journal for recording prayers and answers.',
    },
  ]

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id)
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
  }

  const updateQuantity = (id, change) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + change
        return { ...item, quantity: Math.max(1, newQuantity) }
      }
      return item
    }))
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white section-padding">
        <div className="container-custom text-center">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-5xl font-bold mb-4">Church Store</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Find books, apparel, and resources to support your faith journey.
          </p>
        </div>
      </section>

      {/* Search and Cart */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {cart.length > 0 && (
              <div className="card bg-blue-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Cart: {cart.length} item(s)</span>
                  <span className="font-bold text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => {
              const cartItem = cart.find(item => item.id === product.id)
              return (
                <div key={product.id} className="card group hover:shadow-2xl transition-all">
                  <div className="relative mb-4 overflow-hidden rounded-lg">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {product.category}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                  <p className="text-gray-600 mb-4 text-sm">{product.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-blue-600">${product.price}</span>
                    {cartItem ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-semibold">{cartItem.quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="btn-primary flex items-center"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Add to Cart
                      </button>
                    )}
                  </div>
                  {cartItem && (
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove from cart
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">No products found matching your search.</p>
            </div>
          )}
        </div>
      </section>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <section className="section-padding bg-gray-100">
          <div className="container-custom">
            <div className="max-w-2xl mx-auto card">
              <h2 className="text-2xl font-bold mb-6">Shopping Cart</h2>
              <div className="space-y-4 mb-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-4">
                      <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-gray-600">${item.price} x {item.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mb-6 pt-4 border-t">
                <span className="text-xl font-bold">Total:</span>
                <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
              </div>
              <button className="btn-primary w-full">
                Proceed to Checkout
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default ChurchStore




