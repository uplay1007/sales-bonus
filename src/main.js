/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    
    if (discount < 0 || discount > 100) {
        throw new Error(`Invalid discount: ${discount}%`);
    }
    if (sale_price <= 0) {
        throw new Error(`Invalid price: ${sale_price}`);
    }
    if (quantity <= 0) {
        throw new Error(`Invalid quantity: ${quantity}`);
    }

    return sale_price * (1 - discount / 100) * quantity;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    
    if (index === total - 1 || profit <= 0) {
        return 0;
    }
    
    let bonusRate;
    if (index === 0) {
        bonusRate = 0.15;     
    } else if (index <= 2) {   
        bonusRate = 0.10;      
    } else {
        bonusRate = 0.05;      
    }
    

    return Math.round(profit * bonusRate);
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }
    

    if (!options || typeof options !== 'object') {
        throw new Error('Опции должны быть объектом');
    }
    
    const { calculateRevenue, calculateBonus } = options;
    
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('В опциях отсутствуют необходимые функции');
    }
    
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}  
    }));
    
    const sellerIndex = {};
    sellerStats.forEach(seller => {
        sellerIndex[seller.seller_id] = seller;
    });
    
    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});
    

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;
        
        seller.sales_count += 1;
        seller.revenue += record.total_amount;
        
        if (!record.items || !Array.isArray(record.items)) {
            console.warn('Чек без items:', record.receipt_id);
            return;
        }
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;
            
            const itemRevenue = calculateRevenue(item, product);
            
            const itemCost = product.purchase_price * item.quantity;
            seller.profit += itemRevenue - itemCost;
            
            seller.products_sold[item.sku] = 
                (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });
    
    sellerStats.sort((a, b) => b.profit - a.profit);
    
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold)
        .map(([sku, quantity]) => ({ sku, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    });
    
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),     
        profit: +seller.profit.toFixed(2),       
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)          
    }));
}


/*
BONUSES
Методика расчёта бонусов в проекте такая:
15% — для продавца, который принёс наибольшую прибыль.
10% — для продавцов, которые по прибыли находятся на втором и третьем месте.
5% — для всех остальных продавцов, кроме самого последнего.
0% — для продавца на последнем месте.


SELLER_DICT€
{
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
    products_sold: {}
} 
*/
