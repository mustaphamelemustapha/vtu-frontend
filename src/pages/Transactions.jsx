import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

export default function Transactions() {
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    apiFetch("/transactions/me").then(setTxs).catch(() => {});
  }, []);

  return (
    <div>
      <h2>Transactions</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.reference}</td>
                <td>{tx.tx_type}</td>
                <td>₦ {tx.amount}</td>
                <td>{tx.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
