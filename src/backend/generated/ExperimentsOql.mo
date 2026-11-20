import Entity "mo:caffeineai-oql/Entity";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/experiments";

// Generated row mapping, not a replacement for the app's stored record or authorization.
module {
  // Keep the explicit Entity.new(..., row) adapter below: caffeineai-oql 0.7.1
  // cannot auto-derive nullable timestamps or variant fields through collection.toEntity.
  // This mapping handles those values explicitly; compiler-driven changes must retain that conversion.
  public func row(value : Types.Experiment) : Entity.Row = [
    ("id", #nat(value.id)),
    ("owner", #text(value.owner.toText())),
    ("name", #text(value.name)),
    ("seed", #nat(value.seed)),
    ("envParams", #text(value.envParams)),
    ("populationConfig", #text(value.populationConfig)),
    ("cycle", #nat(value.cycle)),
    ("createdAt", #int(value.createdAt)),
    ("updatedAt", #int(value.updatedAt)),
    ("summary", #text(value.summary)),
  ];

  // Present optionals let an empty collection expose its real scalar schema.
  // This sample is never inserted into the app's collection.
  public func sample() : Types.Experiment = {
    id = 0;
    owner = Principal.fromText("aaaaa-aa");
    name = "sample";
    seed = 0;
    envParams = "sample";
    populationConfig = "sample";
    cycle = 0;
    createdAt = 0;
    updatedAt = 0;
    summary = "sample";
  };

  // Compile-time contract check only: every declared tag must construct the actual record.
  // This private helper is never called or inserted into app data or the OQL builder.
  // caffeineai-oql 0.7.1 registers one schema sample with .sample(sample()); it has no .samples() method.
  func _checkDeclaredVariantTypes() : [Types.Experiment] = [
    sample(),

  ];

  // Register this declaration in the actor's existing Expose entities list.
  // The installed OQL library owns authorization, row filtering, and query execution.
  public func entity<K>(collection : Map.Map<K, Types.Experiment>) : Entity.Decl =
    Entity.new<Types.Experiment>("experiment", func () = collection.values(), "Experiment", "id", row)
      .sample(sample())

      .ownedBy("owner")
      .controllerOrScoped()
      .build();
};
