import { Utils } from './Utils';
import { loggerWarning } from './Bindings';

/*
  Maps shader uniform definitions to tool UI (Tweakpane) field descriptors.

  UI is created for a shader when:
  - shader.ui is true (or an object): all uniforms the engine knows of are exposed
  - shader.ui is not defined: only the uniforms that have an "ui" object are exposed
  - shader.ui is false: no UI is created, even if uniforms define "ui" objects

  An uniform can also define "ui": false to exclude itself from an exposed shader.
*/

const DEFAULT_UI_RANGE = 10.0;
const COLOR_COMPONENTS = ['r', 'g', 'b', 'a'];
const VECTOR_COMPONENTS = ['x', 'y', 'z', 'w'];

// FIXME: deduplicate Shader.js and ShaderUi.js list of automatically assigned uniforms
const AUTOMATIC_UNIFORMS = ['time', 'timePercent', 'color'];
const AUTOMATIC_TEXTURE_UNIFORMS = [
  'texture0',
  'texture1',
  'texture2',
  'texture3'
];

/** @constructor */
const ShaderUi = function (shaderDefinition, options) {
  const opts = options || {};
  this.shaderDefinition = shaderDefinition;
  this.title = opts.title || 'Shader';
  this.source = opts.source;
};

ShaderUi.hasVariableUi = function (variable) {
  return variable.ui === true || Utils.isObject(variable.ui);
};

ShaderUi.isVariableUiDisabled = function (variable) {
  return variable.ui === false;
};

ShaderUi.isUiEnabled = function (shaderDefinition) {
  if (!shaderDefinition) {
    return false;
  }

  if (shaderDefinition.ui === false) {
    return false;
  }

  if (shaderDefinition.ui) {
    return true;
  }

  return (shaderDefinition.variable || []).some((variable) =>
    ShaderUi.hasVariableUi(variable)
  );
};

ShaderUi.isTextureUniform = function (variable, type) {
  return (
    (type || '').startsWith('sampler') ||
    AUTOMATIC_TEXTURE_UNIFORMS.includes(variable.name)
  );
};

ShaderUi.isEngineBoundUniform = function (variable) {
  return (
    AUTOMATIC_UNIFORMS.includes(variable.name) ||
    AUTOMATIC_TEXTURE_UNIFORMS.includes(variable.name)
  );
};

ShaderUi.isDynamicValue = function (value) {
  return (
    Utils.isFunction(value) ||
    (Utils.isString(value) && value.charAt(0) === '{')
  );
};

ShaderUi.getComponentCountForType = function (type) {
  const match = /vec([234])$/.exec(type || '');
  if (match) {
    return parseInt(match[1], 10);
  }

  return 1;
};

ShaderUi.isIntegerType = function (type) {
  return /^(u?int|[iu]vec[234])$/.test(type || '');
};

ShaderUi.getValueComponents = function (variable) {
  const value = variable.value;

  if (value === undefined) {
    return { components: [], form: 'undefined' };
  }

  if (!Array.isArray(value)) {
    return { components: [value], form: 'scalar' };
  }

  if (value.length === 1 && Array.isArray(value[0])) {
    return { components: value[0].slice(), form: 'nested' };
  }

  return { components: value.slice(), form: 'flat' };
};

ShaderUi.setValueComponents = function (variable, components, form) {
  if (form === 'scalar') {
    variable.value = components[0];
    return;
  }

  if (form === 'nested') {
    variable.value = [components.slice()];
    return;
  }

  variable.value = components.slice();
};

ShaderUi.formatValue = function (value) {
  if (value === undefined || value === null) {
    return '-';
  }

  if (Utils.isNumeric(value)) {
    return parseFloat(value).toFixed(3);
  }

  if (Array.isArray(value)) {
    return value.map((item) => ShaderUi.formatValue(item)).join(', ');
  }

  if (Utils.isObject(value)) {
    if (value.isTexture) {
      return value.name || 'texture';
    }

    const components = VECTOR_COMPONENTS.filter(
      (component) => typeof value[component] === 'number'
    );
    if (components.length > 0) {
      return components
        .map((component) => value[component].toFixed(3))
        .join(', ');
    }
  }

  return String(value);
};

ShaderUi.prototype.isAllVariablesExposed = function () {
  return !!this.shaderDefinition.ui;
};

ShaderUi.prototype.getUniformType = function (variable) {
  const ref = this.shaderDefinition.ref;
  const parsedType =
    ref && ref.uniformTypes ? ref.uniformTypes[variable.name] : undefined;
  const ui = Utils.isObject(variable.ui) ? variable.ui : {};
  return String(ui.type || variable.type || parsedType || '').toLowerCase();
};

ShaderUi.prototype.getVariableCount = function () {
  return (this.shaderDefinition.variable || []).length;
};

ShaderUi.prototype.getVariables = function () {
  const variables = this.shaderDefinition.variable || [];
  const allExposed = this.isAllVariablesExposed();

  return variables.filter((variable) => {
    if (!variable || !variable.name) {
      return false;
    }

    if (ShaderUi.isVariableUiDisabled(variable)) {
      return false;
    }

    if (!allExposed && !ShaderUi.hasVariableUi(variable)) {
      return false;
    }

    return !ShaderUi.isTextureUniform(variable, this.getUniformType(variable));
  });
};

ShaderUi.prototype.getUniformValue = function (name) {
  const ref = this.shaderDefinition.ref;
  const material = ref ? ref.material : undefined;
  if (!material) {
    return undefined;
  }

  const uniforms =
    material.uniforms ||
    (material.userData && material.userData.shader
      ? material.userData.shader.uniforms
      : undefined);

  if (!uniforms || uniforms[name] === undefined) {
    return undefined;
  }

  return uniforms[name].value;
};

ShaderUi.prototype.createFields = function () {
  const fields = [];

  this.getVariables().forEach((variable, index) => {
    const field = this.createField(variable, `field${index}`);
    if (field) {
      fields.push(field);
    }
  });

  return fields;
};

ShaderUi.prototype.isReadOnlyVariable = function (variable) {
  const ui = Utils.isObject(variable.ui) ? variable.ui : {};
  const { components, form } = ShaderUi.getValueComponents(variable);

  return (
    ui.readonly === true ||
    this.getUniformType(variable) === 'readonly' ||
    components.some((component) => ShaderUi.isDynamicValue(component)) ||
    (form === 'undefined' && ShaderUi.isEngineBoundUniform(variable))
  );
};

ShaderUi.prototype.createField = function (variable, key) {
  const ui = Utils.isObject(variable.ui) ? variable.ui : {};
  const label = ui.name || ui.label || variable.name;
  const type = this.getUniformType(variable);
  const { components, form } = ShaderUi.getValueComponents(variable);

  if (this.isReadOnlyVariable(variable)) {
    return {
      key,
      label,
      kind: 'readonly',
      params: { label, readonly: true },
      read: () => ShaderUi.formatValue(this.getUniformValue(variable.name))
    };
  }

  const values =
    form === 'undefined'
      ? new Array(ShaderUi.getComponentCountForType(type)).fill(0.0)
      : components;
  const writeForm = form === 'undefined' ? 'flat' : form;

  if (typeof values[0] === 'boolean' || type === 'bool') {
    return {
      key,
      label,
      kind: 'boolean',
      params: { label },
      value: !!values[0],
      write: (value) =>
        ShaderUi.setValueComponents(variable, [!!value], writeForm)
    };
  }

  const numbers = values.map((value) =>
    Utils.isNumeric(value) ? parseFloat(value) : 0.0
  );

  if (this.isColorField(variable, ui, type, numbers)) {
    const componentNames = COLOR_COMPONENTS.slice(0, numbers.length);
    const value = {};
    componentNames.forEach((component, index) => {
      value[component] = numbers[index];
    });

    return {
      key,
      label,
      kind: 'color',
      params: { label, color: { type: 'float' } },
      value,
      write: (color) =>
        ShaderUi.setValueComponents(
          variable,
          componentNames.map((component) => color[component]),
          writeForm
        )
    };
  }

  const integer = ShaderUi.isIntegerType(type);
  const round = (value) => (integer ? Math.round(value) : value);
  const createNumberParams = (value) => ({
    min: ui.min !== undefined ? ui.min : value - DEFAULT_UI_RANGE,
    max: ui.max !== undefined ? ui.max : value + DEFAULT_UI_RANGE,
    step: ui.step !== undefined ? ui.step : integer ? 1 : undefined
  });

  if (numbers.length === 1) {
    return {
      key,
      label,
      kind: 'number',
      params: { label, ...createNumberParams(numbers[0]) },
      value: numbers[0],
      write: (value) =>
        ShaderUi.setValueComponents(variable, [round(value)], writeForm)
    };
  }

  if (numbers.length > VECTOR_COMPONENTS.length) {
    loggerWarning(
      `Uniform '${variable.name}' has ${numbers.length} components, no tool UI created for it`
    );
    return undefined;
  }

  const componentNames = VECTOR_COMPONENTS.slice(0, numbers.length);
  const params = { label };
  const value = {};
  componentNames.forEach((component, index) => {
    params[component] = createNumberParams(numbers[index]);
    value[component] = numbers[index];
  });

  return {
    key,
    label,
    kind: 'point',
    params,
    value,
    write: (point) =>
      ShaderUi.setValueComponents(
        variable,
        componentNames.map((component) => round(point[component])),
        writeForm
      )
  };
};

ShaderUi.prototype.isColorField = function (variable, ui, type, numbers) {
  const isColorByType = ui.type === 'color' || type === 'color';
  const isColorByName =
    /color/i.test(variable.name) && (type === 'vec3' || type === 'vec4');
  if (!isColorByType && !isColorByName) {
    return false;
  }

  if (numbers.length !== 3 && numbers.length !== 4) {
    loggerWarning(
      `Uniform '${variable.name}' has ${numbers.length} components, cannot be used as a color in tool UI`
    );
    return false;
  }

  return true;
};

// Print data that is demo engine script compatible - readonly uniforms are omitted
ShaderUi.prototype.toJsonString = function () {
  const replacer = (key, value) =>
    Utils.isFunction(value) ? value.toString() : value;

  return JSON.stringify(
    {
      variable: this.getVariables()
        .filter((variable) => !this.isReadOnlyVariable(variable))
        .map((variable) => ({
          name: variable.name,
          type: variable.type,
          value: variable.value
        }))
    },
    replacer,
    2
  );
};

export { ShaderUi };
