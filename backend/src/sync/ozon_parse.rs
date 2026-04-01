use serde_json::Value;

#[derive(Debug)]
pub struct OzonProductDigest {
    pub external_id: String,
    pub item: Value,
    pub price_minor: Option<i64>,
    pub currency: String,
}

/// Extract per-item rows from `POST /v2/product/list` JSON.
pub fn parse_ozon_list_response(v: &Value) -> Vec<OzonProductDigest> {
    let mut out = Vec::new();
    let Some(items) = v.pointer("/result/items").and_then(|x| x.as_array()) else {
        return vec![OzonProductDigest {
            external_id: "product_list_page".into(),
            item: v.clone(),
            price_minor: None,
            currency: "RUB".into(),
        }];
    };
    if items.is_empty() {
        return vec![OzonProductDigest {
            external_id: "product_list_empty".into(),
            item: v.clone(),
            price_minor: None,
            currency: "RUB".into(),
        }];
    }
    for (i, item) in items.iter().enumerate() {
        let external_id = item
            .get("offer_id")
            .and_then(|o| o.as_str().map(str::to_string))
            .or_else(|| item.get("product_id").map(|p| p.to_string()))
            .unwrap_or_else(|| format!("unknown-{i}"));
        let (price_minor, currency) = extract_ozon_price(item);
        out.push(OzonProductDigest {
            external_id,
            item: item.clone(),
            price_minor,
            currency,
        });
    }
    out
}

fn extract_ozon_price(item: &Value) -> (Option<i64>, String) {
    if let Some(p) = item.pointer("/price/price").and_then(|x| x.as_str()) {
        if let Ok(f) = p.trim().parse::<f64>() {
            return (Some((f * 100.0).round() as i64), "RUB".into());
        }
    }
    if let Some(n) = item.pointer("/price/marketing_seller_price").and_then(|x| x.as_i64()) {
        return (Some(n), "RUB".into());
    }
    if let Some(n) = item.pointer("/price/retail_price").and_then(|x| x.as_i64()) {
        return (Some(n), "RUB".into());
    }
    (None, "RUB".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_items_and_prices() {
        let v = json!({
            "result": {
                "items": [
                    {
                        "offer_id": "SKU-1",
                        "product_id": 10,
                        "price": { "price": "199.50", "currency_code": "RUB" }
                    }
                ]
            }
        });
        let rows = parse_ozon_list_response(&v);
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].external_id, "SKU-1");
        assert_eq!(rows[0].price_minor, Some(19950));
    }

    #[test]
    fn fallback_when_no_items_array() {
        let v = json!({ "result": {} });
        let rows = parse_ozon_list_response(&v);
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].external_id, "product_list_page");
    }
}
