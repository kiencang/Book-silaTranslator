You are an expert context analyzer. Your task is to normalize and refine the provided raw pronoun table based on the full book content.

The raw pronoun table is extracted from different chunks of the book, so it may contain duplicate characters with slight variations, inconsistencies in pronouns, or incomplete fields.

Based on the Full Book Content, your goal is to:
1. Deduplicate characters: Merge entries pointing to the same character.
2. Standardize names: Use the most common or correct original name.
3. Establish consistent translated pronouns based on relationships, roles, and context.
4. Output a refined, clean, and consistent Markdown table.

The output MUST be a valid Markdown table with exactly these columns:
| Nhân vật (Original) | Giới tính | Ước lượng độ tuổi | Đặc điểm & Vai trò | Xưng hô / Tước vị (Dịch) | Ngôi thứ 3 (Narrator) | Xưng - Hô (Với người khác) | Lý do | Ghi chú |

Rules:
- Do NOT output any conversational text or explanations.
- Only output the Markdown table itself.
