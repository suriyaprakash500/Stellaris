Project Name: “Stellaris” The RMPOSS
Target Audience:
 Foodpreneurs: Small food business owners such as food truck operators,
home chefs, caterers, and owners of small cloud kitchens or restaurants.
 Restaurant Vendors: Business owners who supply raw materials for
QSR’s
 Managers: People who manage day-to-day operations, employee
scheduling, and customer interactions.
 Customers: End customers who will interact with the platform via online
orders, loyalty programs, and feedback systems.
Stakeholders:
 Foodpreneur Owners
 Food Business Managers
 Kitchen Staff
 Delivery Staff
 Customers (End Users)
 Stellaris Development Team (Project Manager, Developers, Designers,
QA)

Project Objectives
1. Empower Foodpreneurs: Provide an intuitive and affordable solution that
helps foodpreneurs manage their businesses efficiently.

2

Author: Gowthaman Balasundaram Project of Vervana
2. Simplify Operations: Integrate essential tools such as order management,
inventory tracking, and employee scheduling into one seamless platform.
3. Enhance Customer Engagement: Help foodpreneurs create loyalty
programs, track customer preferences, and manage feedback.
4. Enable Data-Driven Decisions: Offer reporting tools that give
foodpreneurs valuable insights into sales, inventory, and customer trends.

Functional Requirements
1. Order Management
 Customer Ordering Interface:
o Intuitive online menu with photos, descriptions, and prices.
o Ability to customize orders (e.g., remove ingredients, extra
toppings).
o Multi-channel ordering (e.g., website, mobile app, third-party
platforms).
 Order Tracking:
o Real-time updates on order status (e.g., Order Received, Preparing,
Ready to Deliver).
o Notifications to customers on order progress.
 Payment Integration:
o Secure payment processing with multiple options (credit/debit cards,
wallets, online payment services like PayPal and UPI integrations).
o Option for tipping and splitting bills.

2. Inventory Management
 Stock Monitoring:
o Track ingredients and supplies in real-time, showing current stock
levels.
o Alerts for low stock and automatic reorder notifications.
 Inventory Adjustment:
o Support manual stock adjustments, such as damaged goods or new
deliveries.
 Vendor Management:
o Manage vendor contacts, order histories, and invoices for efficient
procurement.

 Recipe-based Inventory Tracking:
o Automatically adjust inventory levels based on menu items sold
(e.g., tracking ingredients used in each dish).

3

Author: Gowthaman Balasundaram Project of Vervana
3. Employee Management
 Employee Scheduling:
o Create, update, and manage employee schedules.
o Track employee availability and manage shift swaps.
 Timesheet Management:
o Track hours worked, overtime, and ensure payroll is accurate.
 Role-based Access:
o Define access levels for different staff members (e.g., kitchen staff,
waitstaff, managers).

4. Customer Relationship Management (CRM)
 Customer Profiles:
o Collect data on customer preferences, previous orders, and special
requests.
o Track frequent customers and their loyalty status.
 Loyalty Programs:
o Implement reward points systems (e.g., earn points per purchase,
redeem for discounts or free items).
o Customizable loyalty program based on business needs.
 Customer Feedback and Reviews:
o Collect and analyze customer reviews and feedback.
o Automated thank-you messages after orders or feedback
submission.
5. Reporting and Analytics
 Sales Reports:
o Daily, weekly, and monthly sales reports.
o Ability to break down sales by category (e.g., drinks, snacks,
entrees).

 Inventory Usage Report:
o Track inventory consumption and wastage.
o Forecast future inventory needs based on sales trends.
 Customer Insights:
o Data on repeat customers, most popular menu items, and customer
demographics.
 Employee Performance:
o Monitor employee performance based on customer feedback and
work hours.

4

Non-Functional Requirements
1. Scalability
Stellaris should support foodpreneurs as their businesses grow, handling an
increasing number of orders, customers, and inventory items across multiple
locations.
2. Security
 Data Encryption: Encrypt sensitive data such as payment information,
customer profiles, and order details.
 Role-based Access Control (RBAC): Provide different levels of access
for foodpreneurs, managers, and staff.
3. Usability
 Intuitive User Interface: The platform should be easy to use, requiring
minimal training.
 Mobile-Friendly: The system should be accessible via mobile devices for
restaurant managers, delivery staff, and foodpreneurs.
4. Availability and Reliability
 Cloud Hosting: Use cloud solutions to ensure high availability and disaster
recovery.
 99.9% Uptime: Aim for near-perfect uptime to avoid disruptions in
operations.

Technical Requirements
1. Platform and Technology Stack
 Backend: Node.js or Django with RESTful APIs.
 Frontend: React.js or Vue.js for the web interface; React Native or Flutter
for mobile applications.
 Database: PostgreSQL or MySQL for relational database management.
 Cloud Hosting: AWS or Google Cloud for hosting, storage, and
scalability.

5

Author: Gowthaman Balasundaram Project of Vervana
2. Integration
 Payment Gateways: Integration with payment processors like UPI, Visa,
or local payment solutions.
 Delivery Platforms: Integration with third-party delivery platforms like
Swiggy, Zomato, FoodPanda and local couriers providers like Dunzo,
Rapido etc.
 POS Systems: Integration with existing POS hardware if needed.
3. Performance
 Scalability: The system should be capable of handling up to 1,0000 orders
per day across multiple locations.
 Latency: Real-time order processing with low latency to provide
immediate feedback to customers.

Project Milestones
Milestone Description Estimated
Completion

Requirement
Gathering

Gather detailed functional and
technical requirements. 2 weeks
Design Phase UI/UX Design and Wireframing 3 weeks
Backend
Development

Develop core features (order
management, inventory). 6 weeks

Frontend
Development

Develop customer-facing web and
mobile interfaces. 5 weeks
Integration Payment gateway, delivery services,
POS integration. 4 weeks
Testing and QA Alpha and Beta testing, bug fixes. 4 weeks
Launch Deployment, user training, and final
adjustments. 2 weeks

6

Author: Gowthaman Balasundaram Project of Vervana
Testing Strategy
1. Unit Testing
Each module (order, inventory, employee management) will undergo unit testing
to ensure that components work as expected.
2. Integration Testing
Test third-party integrations such as payment gateways, delivery platforms, and
POS systems.
3. User Acceptance Testing (UAT)
Involve foodpreneurs in testing the system in real-world scenarios and gathering
feedback on usability and functionality.
4. Load Testing
Simulate heavy traffic and orders to test the system’s performance under stress.
5. Security Testing
Conduct regular security audits, including testing for vulnerabilities like SQL
injection and data breaches.

Risk Management
1. Delays in Development: Contingency plans include allocating additional
resources or extending the timeline for critical tasks.
2. Integration Challenges: Coordination with third-party services may
introduce delays; continuous communication with vendors is necessary.
3. Security Risks: Regular security patches and updates will be implemented,
with a focus on payment systems and customer data.
4. Adoption Resistance: Offer training and onboarding resources to ensure
smooth transition for foodpreneurs.