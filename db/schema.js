import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const meals = pgTable("meals", {
  id: text("id").primaryKey(),

  // Clerk User ID
  userId: text("user_id").notNull(),

  // Food information
  foodName: text("food_name").notNull(),
  foodNameArabic: text("food_name_arabic"),
  descriptionArabic: text("description_arabic"),

  // Portion
  portionSize: text("portion_size"),
  estimatedGrams: integer("estimated_grams"),

  // Macros
  calories: integer("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fats: real("fats"),

  // AI confidence: "high" | "medium" | "low"
  confidence: text("confidence"),

  // Ingredients returned by AI (JSONB array)
  ingredients: jsonb("ingredients"),

  // Image URL (reserved for future storage)
  imageUrl: text("image_url"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
