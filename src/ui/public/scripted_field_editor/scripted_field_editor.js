import _ from 'lodash';
import { uiModules } from 'ui/modules';
import template from './scripted_field_editor.html';
import './scripted_field_editor.less';
import { keyMap } from '../utils/key_map';
import { IndexPatternsFieldProvider } from 'ui/index_patterns/_field';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';

const module = uiModules.get('kibana');
module.directive('scriptedFieldEditor', function (Private, Notifier, kbnUrl, $timeout, indexPatterns) {
  const fieldFormats = Private(RegistryFieldFormatsProvider);
  const Field = Private(IndexPatternsFieldProvider); 

  return {
    restrict: 'E',
    template,
    scope: {
      indexPatterns: '=',
      filter: '=',
      onDelete: '&',
      onCancel: '&',
      onSave: '&'
    },
    controllerAs: 'scriptedFieldEditor',
    bindToController: true,
    controller: function ($scope, $element) {
      const self = this;
      const notify = new Notifier({ location: 'Scripted Field Editor' });
      self.fieldTypes = ['number', 'string'];
      self.init = () => {
      };

      self.setField = (field) => {
        self.srcField = field;
      };

      self.setType = (type) => {
        self.type = type;
      };

      self.onFieldSelect = (field) => {
        self.setField(field);
        console.log( field);
      };

      self.onTypeSelect = (type) => {
        self.setType(type);
        console.log("set type: " + type);
      };

      self.isValid = () => {
        console.log(self.srcField);
        if(self.srcField == null || self.type == null || self.name == null || self.regEx == null){
          return false;
        }

        return true;
      };
      
      
      $scope.$watch('scriptedFieldEditor.type', function (newValue) {
        console.log("select type: " + newValue);
        
        self.defFormatType = initDefaultFormat();
        self.fieldFormatTypes = [self.defFormatType].concat(fieldFormats.byFieldType[newValue] || []);

        if (_.isUndefined(_.find(self.fieldFormatTypes, { id: self.selectedFormatId }))) {
          delete self.selectedFormatId;
        }
        
      });

      self.save = () => {
        const indexPattern = self.srcField.indexPattern;
        console.log(indexPattern);
        const fields = indexPattern.fields;
        console.log("field name is: " + self.name);
        var newScript = generateScript();

        console.log(newScript);

        const field = new Field(indexPattern, {
          name: self.name,
          lang: "painless",
          scripted: true,
          type: self.type,
          script: newScript
        });

        const index = fields.findIndex(f => f.name === field.name);
        if (index > -1) {
          fields.splice(index, 1, field);
        } else {
          fields.push(field);
        }

        
        return indexPattern.save()
        .then(function () {
          notify.info('Saved Field "' + self.name + '"');
          redirectAway();
        });
      
      };

      function getFieldFormatType() {
        if (self.selectedFormatId) return fieldFormats.getType(self.selectedFormatId);
        else return fieldFormats.getDefaultType(self.field.type);
      }

      function initDefaultFormat() {
        const def = Object.create(fieldFormats.getDefaultType(self.type));

        // explicitly set to undefined to prevent inheritting the prototypes id
        def.id = undefined;
        def.resolvedTitle = def.title;
        def.title = '- default - ';

        return def;
      }

      function redirectAway() {
        kbnUrl.change('/discover');
      }

      function generateScript() {
        var script = "def m = /" + self.regEx + "/.matcher(doc['" + self.srcField.name + ".keyword'].value);\n" + 
                "if ( m.matches() ) {\n";
        
        if(self.type == "number") {
          script = script + "return Float.parseFloat(m.group(1))\n";
          script += "} else {\n";
          script += "return 0\n";
          script += "}\n";
        }else {
          script = script + "return m.group(1)\n";
          script += "} else {\n";
          script += "return \"\"\n";
          script += "}\n";
        }

        return script;

        //def m = /^([0-9]+)\..*$/.matcher(doc['clientip.keyword'].value);
        //if ( m.matches() ) {
        //   return Integer.parseInt(m.group(1))
        //} else {
        //   return 0
        //}
      }

      $element.on('keydown', (event) => {
        if (keyMap[event.keyCode] === 'escape') {
          $timeout(() => self.onCancel());
        }
      });
    }
  };
});
