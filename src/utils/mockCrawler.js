/**
 * Simulates crawling a Naver Place URL.
 * In a real app, this would call a backend API.
 */
export const crawlNaverPlace = async (url) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch('/api/parse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to crawl:", error);
        throw error;
    }
};

const MOCK_DB = [
    {
        name: "Golden Pig Restaurant",
        category: "Korean BBQ",
        image: "https://images.unsplash.com/photo-1594179047519-f347310d3322?q=80&w=2070&auto=format&fit=crop",
        tags: ["Michelin Guide", "Pork Belly", "Trendy"],
        priceRange: "$$$",
        menu: "Pork Belly (180g) - 19,000 KRW"
    },
    {
        name: "Sushi Sora",
        category: "Sushi Omakase",
        image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=2070&auto=format&fit=crop",
        tags: ["Fresh", "Date Night", "Quiet"],
        priceRange: "$$$$",
        menu: "Lunch Omakase - 60,000 KRW"
    },
    {
        name: "Downtowner Burger",
        category: "Burger",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1998&auto=format&fit=crop",
        tags: ["Avocado Burger", "Hip", "Fast Casual"],
        priceRange: "$$",
        menu: "Avocado Burger - 10,800 KRW"
    },
    {
        name: "Mingles",
        category: "Modern Korean",
        image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974&auto=format&fit=crop",
        tags: ["Fine Dining", "Gangnam", "Fusion"],
        priceRange: "$$$$$",
        menu: "Dinner Course - 280,000 KRW"
    }
];
