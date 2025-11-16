import React from "react";

export default function TableResponse({ table }) {
  if (!table || table.length === 0) return null;

  const keys = Object.keys(table[0]);
  return (
    <table className="min-w-full bg-white dark:bg-gray-800 text-left">
      <thead>
        <tr>
          {keys.map((k) => (
            <th key={k} className="px-4 py-2 border-b dark:border-gray-700">
              {k}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.map((row, i) => (
          <tr key={i} className="even:bg-gray-100 dark:even:bg-gray-700">
            {keys.map((k) => (
              <td key={k} className="px-4 py-2 border-b dark:border-gray-700">
                {row[k]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
