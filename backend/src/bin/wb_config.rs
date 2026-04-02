use clap::{Parser, Subcommand};
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;

#[derive(Parser, Debug)]
#[command(
    name = "wb_config",
    about = "Manage runtime app_config values",
    long_about = "Runtime configuration utility for app_config with schema validation and audit logging.",
    after_help = "Examples:\n  wb_config config get free_daily_quota_base\n  wb_config config set free_daily_quota_base 30 --actor deploy-bot\n  wb_config config set-many free_daily_quota_base=30 ai_provider=\"openrouter\"\n  wb_config config list\n  wb_config config validate"
)]
struct Cli {
    #[command(subcommand)]
    command: TopLevelCommand,
}

#[derive(Subcommand, Debug)]
enum TopLevelCommand {
    /// Runtime config operations
    Config {
        #[command(subcommand)]
        command: ConfigCommand,
    },
}

#[derive(Subcommand, Debug)]
enum ConfigCommand {
    /// Get one config key
    Get { key: String },
    /// Set one config key
    Set {
        key: String,
        value: String,
        #[arg(long, default_value = "wb_config")]
        actor: String,
    },
    /// Set multiple keys atomically: key=value key2=value2
    SetMany {
        pairs: Vec<String>,
        #[arg(long, default_value = "wb_config")]
        actor: String,
    },
    /// List all config rows
    List,
    /// Validate runtime config schema from DB
    Validate,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    let database_url = std::env::var("DATABASE_URL").map_err(|e| format!("DATABASE_URL: {e}"))?;
    let pool = PgPoolOptions::new()
        .max_connections(3)
        .connect(&database_url)
        .await?;

    match cli.command {
        TopLevelCommand::Config { command } => match command {
            ConfigCommand::Get { key } => {
                let value = backend::config::get_config_value(&pool, &key).await?;
                println!("{}", serde_json::to_string_pretty(&value)?);
            }
            ConfigCommand::Set { key, value, actor } => {
                let parsed = backend::config::parse_cli_value(&value);
                backend::config::apply_config_updates(&pool, vec![(key, parsed)], &actor).await?;
                println!("ok");
            }
            ConfigCommand::SetMany { pairs, actor } => {
                if pairs.is_empty() {
                    return Err("set-many requires at least one key=value pair".into());
                }
                let mut updates: Vec<(String, Value)> = Vec::with_capacity(pairs.len());
                for pair in pairs {
                    let mut parts = pair.splitn(2, '=');
                    let key = parts
                        .next()
                        .filter(|k| !k.is_empty())
                        .ok_or_else(|| format!("invalid key=value pair: {pair}"))?;
                    let raw_value = parts
                        .next()
                        .ok_or_else(|| format!("invalid key=value pair: {pair}"))?;
                    updates.push((key.to_string(), backend::config::parse_cli_value(raw_value)));
                }
                backend::config::apply_config_updates(&pool, updates, &actor).await?;
                println!("ok");
            }
            ConfigCommand::List => {
                let rows = backend::config::list_config(&pool).await?;
                for row in rows {
                    println!("{}={}", row.key, serde_json::to_string(&row.value_json)?);
                }
            }
            ConfigCommand::Validate => {
                let cfg = backend::config::load_runtime_config(&pool).await?;
                println!("valid: {:?}", cfg);
            }
        },
    }

    Ok(())
}
