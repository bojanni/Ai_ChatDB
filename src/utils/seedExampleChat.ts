import { supabase } from '../lib/supabase';

const EXAMPLE_CHAT_FLAG = 'example_chat_seeded_v2';

interface DemoChat {
  title: string;
  ai_source: string;
  tags: string[];
  summary: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

const DEMO_CHATS: DemoChat[] = [
  {
    title: 'Building a React Dashboard with TypeScript',
    ai_source: 'ChatGPT',
    tags: ['react', 'typescript', 'state-management', 'context-api', 'performance', 'localstorage', 'hooks'],
    summary: 'A comprehensive discussion about implementing state management in React TypeScript dashboard using Context API, with focus on performance optimization and localStorage persistence.',
    messages: [
      {
        role: 'user',
        content: "I'm building a dashboard application in React with TypeScript and I'm having trouble with state management. I have multiple components that need to share data about the current user, theme preferences, and notification settings. What's the best approach for this?",
      },
      {
        role: 'assistant',
        content: `For a dashboard application with shared state across multiple components, you have several good options depending on your needs:

1. **React Context API** (Built-in, good for simple to medium complexity):
\`\`\`typescript
interface AppContextType {
  user: User | null;
  theme: 'light' | 'dark';
  notifications: NotificationSettings;
  updateTheme: (theme: 'light' | 'dark') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notifications, setNotifications] = useState<NotificationSettings>({});

  const value = {
    user,
    theme,
    notifications,
    updateTheme: setTheme
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
\`\`\`

2. **Zustand** (Lightweight, great for medium complexity):
\`\`\`typescript
import create from 'zustand';

interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  notifications: NotificationSettings;
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  theme: 'light',
  notifications: {},
  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme })
}));
\`\`\`

For a dashboard, I'd recommend starting with Context API if it's your first time, or Zustand if you want something more scalable with less boilerplate.`,
      },
      {
        role: 'user',
        content: "I like the Context API approach. But I'm worried about performance. Won't every component re-render when any part of the context changes?",
      },
      {
        role: 'assistant',
        content: `Great question! Yes, that's a common concern with Context API. Here are strategies to optimize performance:

1. **Split contexts by concern**:
\`\`\`typescript
// Separate contexts for different concerns
const UserContext = createContext<UserContextType | undefined>(undefined);
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
\`\`\`

This way, components only re-render when their specific context changes.

2. **Use memo and useMemo**:
\`\`\`typescript
const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Memoize the context value
  const value = useMemo(() => ({
    user,
    theme,
    setUser,
    setTheme
  }), [user, theme]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
\`\`\`

3. **Custom hooks with selectors**:
\`\`\`typescript
export function useUser() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useUser must be used within AppProvider');
  return context.user;
}

export function useTheme() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useTheme must be used within AppProvider');
  return { theme: context.theme, setTheme: context.setTheme };
}
\`\`\`

This allows components to only subscribe to the specific parts they need.`,
      },
      {
        role: 'user',
        content: 'Perfect! One more thing - how do I persist the theme preference to localStorage so it survives page refreshes?',
      },
      {
        role: 'assistant',
        content: `You can add an effect to sync with localStorage. Here's a complete example:

\`\`\`typescript
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Initialize theme from localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  // Persist theme changes to localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme);
    // Optional: apply theme to document
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const value = useMemo(() => ({
    user,
    theme,
    setUser,
    setTheme
  }), [user, theme]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
\`\`\`

You could also create a custom hook to make this reusable:

\`\`\`typescript
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.error('Failed to save to localStorage');
    }
  }, [key, value]);

  return [value, setValue] as const;
}

// Usage in your provider:
const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
\`\`\`

This gives you automatic localStorage persistence for any value!`,
      },
      {
        role: 'user',
        content: 'This is exactly what I needed. Thanks for the detailed explanations and code examples!',
      },
      {
        role: 'assistant',
        content: "You're welcome! Good luck with your dashboard project. Feel free to ask if you run into any other issues with state management or TypeScript types!",
      },
    ],
  },
  {
    title: 'Understanding Docker Containers and Microservices',
    ai_source: 'Claude',
    tags: ['docker', 'microservices', 'devops', 'containers', 'architecture'],
    summary: 'Discussion about Docker containerization, microservices architecture, and best practices for deploying scalable applications.',
    messages: [
      {
        role: 'user',
        content: "I keep hearing about Docker and microservices. Can you explain what they are and why they're useful?",
      },
      {
        role: 'assistant',
        content: `Great question! Let me break this down:

**Docker** is a containerization platform that packages your application and all its dependencies into a standardized unit called a container. Think of it as a lightweight, portable box that contains everything your app needs to run.

**Key benefits of Docker:**
- Consistency: "Works on my machine" becomes "works everywhere"
- Isolation: Each container runs independently
- Efficiency: Containers share the OS kernel, making them lighter than VMs
- Portability: Run the same container on your laptop, server, or cloud

**Microservices** is an architectural approach where you split your application into small, independent services that communicate with each other. Instead of one large application, you have many small ones.

**Example comparison:**

Monolithic: One big application handling users, payments, inventory, shipping
Microservices: Separate services for each (user-service, payment-service, inventory-service, shipping-service)

**Why combine Docker + Microservices?**
- Each microservice can be deployed in its own container
- Scale individual services independently
- Update one service without affecting others
- Use different technologies for different services`,
      },
      {
        role: 'user',
        content: 'That makes sense! How do I actually create a Docker container for a Node.js application?',
      },
      {
        role: 'assistant',
        content: `Here's a step-by-step guide to containerize a Node.js app:

**1. Create a Dockerfile in your project root:**

\`\`\`dockerfile
# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Command to run your app
CMD ["node", "server.js"]
\`\`\`

**2. Create a .dockerignore file:**

\`\`\`
node_modules
npm-debug.log
.env
.git
\`\`\`

**3. Build the Docker image:**

\`\`\`bash
docker build -t my-node-app .
\`\`\`

**4. Run the container:**

\`\`\`bash
docker run -p 3000:3000 my-node-app
\`\`\`

**Best practices:**
- Use alpine images (smaller size)
- Use multi-stage builds for production
- Don't run as root user
- Use .dockerignore to exclude unnecessary files
- Set proper health checks`,
      },
      {
        role: 'user',
        content: 'What about when I have multiple services that need to talk to each other? Like a backend API and a database?',
      },
      {
        role: 'assistant',
        content: `Excellent question! For multiple services, you'll want to use **Docker Compose**.

Create a \`docker-compose.yml\` file:

\`\`\`yaml
version: '3.8'

services:
  # Backend API
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
    depends_on:
      - db
    volumes:
      - ./api:/app
      - /app/node_modules

  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis Cache (optional)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
\`\`\`

**Run everything with one command:**

\`\`\`bash
docker-compose up
\`\`\`

**Key features:**
- Services automatically discover each other by name (e.g., "db" in the connection string)
- Shared networks between containers
- Easy environment variable management
- Volume mounting for data persistence
- Dependencies management with \`depends_on\`

**Useful commands:**

\`\`\`bash
docker-compose up -d        # Run in background
docker-compose down         # Stop all services
docker-compose logs api     # View logs for specific service
docker-compose exec api sh  # Shell into a container
\`\`\``,
      },
    ],
  },
  {
    title: 'CSS Grid vs Flexbox: When to Use Each',
    ai_source: 'Gemini',
    tags: ['css', 'web-design', 'layout', 'frontend', 'responsive'],
    summary: 'Comparison of CSS Grid and Flexbox layout systems, with practical examples and use cases for each.',
    messages: [
      {
        role: 'user',
        content: "I'm confused about when to use CSS Grid versus Flexbox. They seem to do similar things. Can you explain the difference?",
      },
      {
        role: 'assistant',
        content: `Great question! While Grid and Flexbox can overlap, they're designed for different purposes:

**Flexbox (1-dimensional):**
- Best for laying out items in a single direction (row OR column)
- Content-first approach (items determine the layout)
- Perfect for: navigation bars, card layouts, centering items, spacing between items

**CSS Grid (2-dimensional):**
- Best for layouts in both rows AND columns simultaneously
- Layout-first approach (you define the grid structure)
- Perfect for: page layouts, complex UI patterns, magazine-style layouts

**Simple rule of thumb:**
- Flexbox: When you're laying things out in a line
- Grid: When you need rows AND columns at the same time

**Example - Flexbox for navigation:**

\`\`\`css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
\`\`\`

**Example - Grid for page layout:**

\`\`\`css
.page-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 60px 1fr 40px;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  gap: 1rem;
  height: 100vh;
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.footer { grid-area: footer; }
\`\`\`

You can (and should!) use them together in the same project!`,
      },
      {
        role: 'user',
        content: 'Can you show me a practical example where I might use both in the same component?',
      },
      {
        role: 'assistant',
        content: `Absolutely! Here's a card grid layout where Grid and Flexbox work together:

\`\`\`html
<div class="card-grid">
  <div class="card">
    <img src="product.jpg" alt="Product">
    <div class="card-content">
      <h3>Product Name</h3>
      <p>Description goes here</p>
      <div class="card-footer">
        <span class="price">$29.99</span>
        <button>Add to Cart</button>
      </div>
    </div>
  </div>
  <!-- More cards... -->
</div>
\`\`\`

\`\`\`css
/* Grid for the overall card layout */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  padding: 2rem;
}

/* Flexbox for card internal structure */
.card {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 1rem;
}

/* Flexbox for footer alignment */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}
\`\`\`

**Why this combination works:**

1. **Grid for card-grid:** Creates a responsive grid that automatically adjusts columns
2. **Flexbox for card:** Stacks content vertically and allows footer to stick to bottom
3. **Flexbox for card-footer:** Aligns price and button horizontally with space between

**The responsive part is magical:**
- \`auto-fit\` creates as many columns as possible
- \`minmax(280px, 1fr)\` ensures cards are never smaller than 280px
- Automatically wraps to fewer columns on smaller screens
- No media queries needed!`,
      },
      {
        role: 'user',
        content: 'This is really helpful! One last thing - how do I center a div both horizontally and vertically?',
      },
      {
        role: 'assistant',
        content: `The classic question! Here are the best modern approaches:

**Method 1: Flexbox (most common)**

\`\`\`css
.container {
  display: flex;
  justify-content: center;  /* horizontal */
  align-items: center;      /* vertical */
  height: 100vh;
}
\`\`\`

**Method 2: Grid (equally simple)**

\`\`\`css
.container {
  display: grid;
  place-items: center;  /* centers both directions */
  height: 100vh;
}
\`\`\`

**Method 3: Grid with the child**

\`\`\`css
.container {
  display: grid;
  height: 100vh;
}

.centered-div {
  margin: auto;
}
\`\`\`

**Method 4: Position absolute (classic)**

\`\`\`css
.container {
  position: relative;
  height: 100vh;
}

.centered-div {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
\`\`\`

**My recommendation:**
- Use **Flexbox** if the container has other flex items
- Use **Grid with place-items** for the simplest one-liner
- Use **Position** only if you need to overlay content

All of these work great! Pick whichever fits your use case best.`,
      },
    ],
  },
  {
    title: 'Python Data Analysis with Pandas',
    ai_source: 'ChatGPT',
    tags: ['python', 'pandas', 'data-analysis', 'data-science', 'csv'],
    summary: 'Introduction to data analysis using Python Pandas library, covering data loading, cleaning, and basic analysis operations.',
    messages: [
      {
        role: 'user',
        content: "I have a CSV file with sales data and I need to analyze it. I've heard Pandas is good for this. Where do I start?",
      },
      {
        role: 'assistant',
        content: `Pandas is perfect for this! Let's get you started with a complete workflow:

**1. Install and import:**

\`\`\`python
pip install pandas
\`\`\`

\`\`\`python
import pandas as pd

# Load your CSV
df = pd.read_csv('sales_data.csv')

# First look at your data
print(df.head())        # First 5 rows
print(df.info())        # Column types and missing values
print(df.describe())    # Statistical summary
\`\`\`

**2. Basic exploration:**

\`\`\`python
# Check data shape
print(f"Rows: {len(df)}, Columns: {len(df.columns)}")

# Check for missing values
print(df.isnull().sum())

# View column names
print(df.columns.tolist())
\`\`\`

**3. Common analysis operations:**

\`\`\`python
# Filter data
high_sales = df[df['amount'] > 1000]

# Group and aggregate
sales_by_region = df.groupby('region')['amount'].sum()

# Sort values
top_products = df.groupby('product')['amount'].sum().sort_values(ascending=False)

# Add calculated columns
df['profit'] = df['revenue'] - df['cost']
df['profit_margin'] = (df['profit'] / df['revenue']) * 100
\`\`\`

**4. Export results:**

\`\`\`python
# Save to new CSV
df.to_csv('analyzed_sales.csv', index=False)

# Save summary to Excel
sales_by_region.to_excel('sales_summary.xlsx')
\`\`\`

What kind of analysis are you trying to do specifically?`,
      },
      {
        role: 'user',
        content: 'I need to find the top 10 products by revenue and see which months had the highest sales. The date column is in format "2024-01-15".',
      },
      {
        role: 'assistant',
        content: `Perfect! Here's how to do both analyses:

\`\`\`python
import pandas as pd

# Load data
df = pd.read_csv('sales_data.csv')

# Convert date column to datetime
df['date'] = pd.to_datetime(df['date'])

# Extract month and year for grouping
df['month'] = df['date'].dt.month
df['year'] = df['date'].dt.year
df['month_name'] = df['date'].dt.strftime('%B %Y')

# Top 10 products by revenue
top_10_products = (
    df.groupby('product')['revenue']
    .sum()
    .sort_values(ascending=False)
    .head(10)
)

print("Top 10 Products by Revenue:")
print(top_10_products)
print()

# Sales by month
monthly_sales = (
    df.groupby('month_name')['revenue']
    .sum()
    .sort_values(ascending=False)
)

print("Sales by Month (Highest to Lowest):")
print(monthly_sales)
print()

# More detailed monthly analysis
monthly_detailed = df.groupby(['year', 'month']).agg({
    'revenue': 'sum',
    'product': 'count',  # number of transactions
    'revenue': ['sum', 'mean']  # total and average
}).round(2)

print("Detailed Monthly Analysis:")
print(monthly_detailed)

# Create a visualization-ready summary
summary = pd.DataFrame({
    'Top Products': top_10_products,
    'Revenue': top_10_products.values
})

summary.to_csv('top_products_report.csv')
monthly_sales.to_csv('monthly_sales_report.csv')

print("\nReports saved!")
\`\`\`

**Bonus - Add percentage calculations:**

\`\`\`python
# What percentage of total revenue does each top product represent?
total_revenue = df['revenue'].sum()
top_10_products_pct = (top_10_products / total_revenue * 100).round(2)

print("\nTop 10 Products (% of Total Revenue):")
for product, pct in top_10_products_pct.items():
    print(f"{product}: {pct}%")
\`\`\``,
      },
    ],
  },
  {
    title: 'Introduction to Machine Learning Concepts',
    ai_source: 'Claude',
    tags: ['machine-learning', 'ai', 'data-science', 'neural-networks', 'algorithms'],
    summary: 'Beginner-friendly explanation of core machine learning concepts, types of learning, and common algorithms.',
    messages: [
      {
        role: 'user',
        content: "I'm a software developer wanting to learn about machine learning. Can you explain it in terms I'd understand?",
      },
      {
        role: 'assistant',
        content: `Absolutely! Let me explain ML using programming concepts you already know.

**Machine Learning is essentially:**
Writing programs that improve their behavior based on data, rather than explicit programming.

**Traditional Programming:**
\`\`\`
Input + Rules → Output
Example: if (temperature > 30) { return "hot"; }
\`\`\`

**Machine Learning:**
\`\`\`
Input + Output → Rules (learned automatically)
Example: Give it 1000s of temperatures labeled "hot" or "cold",
and it figures out the rule itself
\`\`\`

**Three main types of ML:**

**1. Supervised Learning** (like having a teacher)
- You provide labeled training data: (input, correct answer)
- Algorithm learns to map inputs to outputs
- Examples: Email spam detection, image classification, price prediction

**2. Unsupervised Learning** (like self-study)
- You provide data without labels
- Algorithm finds patterns on its own
- Examples: Customer segmentation, anomaly detection, recommendation systems

**3. Reinforcement Learning** (like training a pet)
- Algorithm learns through trial and error
- Gets rewards for good actions, penalties for bad ones
- Examples: Game AI, robotics, autonomous driving

**A simple example in pseudocode:**

\`\`\`python
# Traditional approach (explicit rules)
def is_spam(email):
    if "free money" in email or "click here" in email:
        return True
    return False

# ML approach (learned rules)
model = train_model(
    training_data=[
        ("Win free money now!", spam=True),
        ("Meeting at 3pm", spam=False),
        ("Click here for prizes", spam=True),
        # ... thousands more examples
    ]
)

# Now it can classify new emails
model.predict("Limited time offer!")  # → spam=True (probably)
\`\`\`

Want me to explain any specific type in more detail?`,
      },
      {
        role: 'user',
        content: 'This is really clear! Can you explain what neural networks are and why everyone talks about them?',
      },
      {
        role: 'assistant',
        content: `Great question! Neural networks are inspired by how brains work, but think of them as fancy function approximators.

**The basic idea:**

Think of a neural network as a series of functions chained together, where each function transforms the data a little bit.

\`\`\`
Input → Layer 1 → Layer 2 → Layer 3 → Output
  ↓         ↓          ↓          ↓         ↓
 [5,2]   [3,4,6]    [8,1]      [4,9]     [0.8]
(raw)   (patterns) (features) (complex)  (result)
\`\`\`

**A neuron is like a simple function:**

\`\`\`python
def neuron(inputs, weights, bias):
    # 1. Multiply each input by its weight
    weighted_sum = sum(input * weight for input, weight in zip(inputs, weights))

    # 2. Add bias (shifts the function)
    result = weighted_sum + bias

    # 3. Apply activation function (introduces non-linearity)
    return activation(result)  # e.g., relu(x) = max(0, x)
\`\`\`

**Why they're powerful:**

1. **Universal Function Approximators:** Can learn almost any pattern given enough neurons and data
2. **Automatic Feature Learning:** No need to manually design features - the network figures out what matters
3. **Scalability:** More data + more layers = better performance (usually)

**A simple example:**

\`\`\`python
# Imagine predicting house prices
Input: [bedrooms, size, location_score]
       ↓
Hidden Layer 1: Learns basic features
  - Neuron 1: "Is it spacious?" (combines bedrooms + size)
  - Neuron 2: "Is location good?"
  - Neuron 3: "Is it luxury?" (combines all)
       ↓
Hidden Layer 2: Learns complex patterns
  - Neuron 1: "Family home" (spacious + good location)
  - Neuron 2: "Investment property" (luxury + location)
       ↓
Output: Predicted price
\`\`\`

**Types you'll hear about:**

- **CNN** (Convolutional Neural Networks): Great for images
- **RNN** (Recurrent Neural Networks): Great for sequences (text, time series)
- **Transformers**: Current state-of-the-art for language (GPT, BERT)

**Why so popular now:**
- More data available than ever
- GPUs make training fast
- Proven to work incredibly well for complex problems

The "deep" in "deep learning" just means networks with many layers (deep networks vs shallow networks).`,
      },
    ],
  },
  {
    title: 'REST API Design Best Practices',
    ai_source: 'Gemini',
    tags: ['api', 'rest', 'backend', 'web-development', 'http', 'design-patterns'],
    summary: 'Comprehensive guide to designing RESTful APIs following industry best practices and conventions.',
    messages: [
      {
        role: 'user',
        content: "I'm building a REST API for the first time. What are the key principles I should follow?",
      },
      {
        role: 'assistant',
        content: `Great question! Here are the core principles of good REST API design:

**1. Use Proper HTTP Methods**

\`\`\`
GET     /users          - Get all users (read)
GET     /users/123      - Get specific user (read)
POST    /users          - Create new user (create)
PUT     /users/123      - Update entire user (update/replace)
PATCH   /users/123      - Update partial user (update/modify)
DELETE  /users/123      - Delete user (delete)
\`\`\`

**2. Use Nouns, Not Verbs in URLs**

❌ Bad:
\`\`\`
GET /getUsers
POST /createUser
POST /deleteUser/123
\`\`\`

✅ Good:
\`\`\`
GET /users
POST /users
DELETE /users/123
\`\`\`

**3. Use Plural Nouns for Collections**

\`\`\`
/users          (not /user)
/products       (not /product)
/orders         (not /order)
\`\`\`

**4. Return Proper HTTP Status Codes**

\`\`\`
200 OK                  - Successful GET, PUT, PATCH
201 Created             - Successful POST
204 No Content          - Successful DELETE
400 Bad Request         - Invalid input
401 Unauthorized        - Not authenticated
403 Forbidden           - Authenticated but not allowed
404 Not Found           - Resource doesn't exist
500 Internal Error      - Server error
\`\`\`

**5. Nest Resources Properly**

\`\`\`
GET    /users/123/posts         - Get posts by user 123
GET    /users/123/posts/456     - Get post 456 by user 123
POST   /users/123/posts         - Create post for user 123
DELETE /users/123/posts/456     - Delete post 456 by user 123
\`\`\`

**6. Use Query Parameters for Filtering & Pagination**

\`\`\`
GET /users?role=admin&status=active
GET /users?page=2&limit=20
GET /users?sort=created_at&order=desc
GET /products?category=electronics&price_max=1000
\`\`\`

Want me to show you practical implementation examples?`,
      },
      {
        role: 'user',
        content: 'Yes! Can you show me a complete example with proper error handling?',
      },
      {
        role: 'assistant',
        content: `Absolutely! Here's a complete Express.js example with best practices:

\`\`\`javascript
const express = require('express');
const app = express();

app.use(express.json());

// Mock database
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' }
];

// GET /users - List all users with filtering and pagination
app.get('/users', (req, res) => {
  try {
    let filtered = [...users];

    // Filter by role if provided
    if (req.query.role) {
      filtered = filtered.filter(u => u.role === req.query.role);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {
      data: filtered.slice(startIndex, endIndex),
      pagination: {
        current_page: page,
        total_pages: Math.ceil(filtered.length / limit),
        total_items: filtered.length,
        per_page: limit
      }
    };

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/:id - Get single user
app.get('/users/:id', (req, res) => {
  try {
    const user = users.find(u => u.id === parseInt(req.params.id));

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: \`No user exists with id \${req.params.id}\`
      });
    }

    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users - Create new user
app.post('/users', (req, res) => {
  try {
    const { name, email, role } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Name and email are required',
        fields: {
          name: !name ? 'Name is required' : null,
          email: !email ? 'Email is required' : null
        }
      });
    }

    // Check if email already exists
    if (users.find(u => u.email === email)) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
    }

    const newUser = {
      id: users.length + 1,
      name,
      email,
      role: role || 'user'
    };

    users.push(newUser);

    res.status(201)
       .location(\`/users/\${newUser.id}\`)
       .json({
         data: newUser,
         message: 'User created successfully'
       });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /users/:id - Update user
app.patch('/users/:id', (req, res) => {
  try {
    const user = users.find(u => u.id === parseInt(req.params.id));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, email, role } = req.body;

    // Update only provided fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;

    res.status(200).json({
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /users/:id - Delete user
app.delete('/users/:id', (req, res) => {
  try {
    const index = users.findIndex(u => u.id === parseInt(req.params.id));

    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    users.splice(index, 1);

    res.status(204).send(); // No content
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));
\`\`\`

**Key points:**
- Consistent response structure
- Proper status codes
- Validation with clear error messages
- Location header on resource creation
- Query parameter support
- Try-catch error handling`,
      },
    ],
  },
];

export async function seedExampleChatIfNeeded(): Promise<boolean> {
  try {
    if (localStorage.getItem(EXAMPLE_CHAT_FLAG) === 'true') {
      return false;
    }

    const { data: existingChats, error: chatsError } = await supabase
      .from('chats')
      .select('id')
      .limit(1);

    if (chatsError) {
      console.error('Error checking existing chats:', chatsError);
      return false;
    }

    if (existingChats && existingChats.length > 0) {
      localStorage.setItem(EXAMPLE_CHAT_FLAG, 'true');
      return false;
    }

    for (const demoChat of DEMO_CHATS) {
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          title: demoChat.title,
          ai_source: demoChat.ai_source,
          tags: demoChat.tags,
          summary: demoChat.summary,
        })
        .select()
        .single();

      if (chatError) {
        console.error('Error creating demo chat:', chatError);
        continue;
      }

      const messages = demoChat.messages.map(msg => ({
        chat_id: chat.id,
        role: msg.role,
        content: msg.content,
      }));

      const { error: messagesError } = await supabase
        .from('messages')
        .insert(messages);

      if (messagesError) {
        console.error('Error creating demo messages:', messagesError);
      }
    }

    localStorage.setItem(EXAMPLE_CHAT_FLAG, 'true');
    return true;

  } catch (error) {
    console.error('Error seeding demo chats:', error);
    return false;
  }
}
