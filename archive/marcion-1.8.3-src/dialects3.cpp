/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "dialects3.h"
#include "ui_dialects3.h"

//
CDialects3::CDialects3( QWidget * parent)
    : QWidget(parent),
      ui(new Ui::frmDialectsWidget)
{
    ui->setupUi(this);

    ui->tblWords->setColumnWidth(0,300);
        for(int x=1;x<11;x++)
        ui->tblWords->setColumnWidth(x,30);

        ui->widgetGreek->setScript(CTranslit::Greek);
        ui->widgetGreek->setSwitch(false);
        ui->widgetGreek->setSwitchState(true);
}

CDialects3::~CDialects3()
{
    delete ui;
}

//
void CDialects3::prepRow(int row)
{
    CLatCopt * w=new CLatCopt();
    w->setScript(CTranslit::Copt);
    //w->setFont(font);
    w->setSwitchState(true);
    ui->tblWords->setRowHeight(row,w->height());
        ui->tblWords->setItem(row,0,new QTableWidgetItem(0));
        ui->tblWords->setCellWidget(row,0,w);
        for(int x=1;x<11;x++)
        {
            QCheckBox * cb=new QCheckBox();
            //cb->setIconSize(cb->iconSize()*2);
            ui->tblWords->setCellWidget(row,x,cb);
        }
        ui->tblWords->scrollToItem(ui->tblWords->item(row,0),QAbstractItemView::PositionAtBottom);

}

void CDialects3::on_btAdd_clicked()
{
	int r;
    ui->tblWords->setRowCount(r=(ui->tblWords->rowCount()+1));
	prepRow(r-1);
        //tblWords->scrollToBottom();
}

void CDialects3::on_btDel_clicked()
{
    ui->tblWords->removeRow(ui->tblWords->currentRow());
}

void CDialects3::on_btIns_clicked()
{
    int r=ui->tblWords->currentRow();
    ui->tblWords->insertRow(r);
	prepRow(r);
}

QString CDialects3::engText() const
{
    return ui->txtEnglish->text();
}
QString CDialects3::greekText() const
{
    return ui->widgetGreek->text();
}

void CDialects3::setCoptic()
{
    ui->lstChooser->setCurrentRow(0);
}

QString CDialects3::makeRecord() const
{
	QString record;
    for(int x=0;x<ui->tblWords->rowCount();x++)
	{
		QString r("(");
        if(((QCheckBox*)ui->tblWords->cellWidget(x,1))->isChecked())
			r.append("S,");
        if(((QCheckBox*)ui->tblWords->cellWidget(x,2))->isChecked())
			r.append("Sa,");
        if(((QCheckBox*)ui->tblWords->cellWidget(x,3))->isChecked())
			r.append("Sf,");
        if(((QCheckBox*)ui->tblWords->cellWidget(x,4))->isChecked())
			r.append("A,");
        if(((QCheckBox*)ui->tblWords->cellWidget(x,5))->isChecked())
			r.append("sA,");
        if(((QCheckBox*)ui->tblWords->cellWidget(x,6))->isChecked())
			r.append("B,");
        if(((QCheckBox*)ui->tblWords->cellWidget(x,7))->isChecked())
			r.append("F,");
        if(((QCheckBox*)ui->tblWords->cellWidget(x,8))->isChecked())
			r.append("Fb,");
        if(((QCheckBox*)ui->tblWords->cellWidget(x,9))->isChecked())
			r.append("O,");
                if(((QCheckBox*)ui->tblWords->cellWidget(x,10))->isChecked())
                        r.append("NH,");

        QString w(((CLatCopt*)ui->tblWords->cellWidget(x,0))->text().trimmed());
		if(!w.isNull())
		{
			if(r!="(")
				r.chop(1);
			record.append(r+") "+w+" ");
		}

	}
	if(!record.isNull())
		record.chop(1);
        if(record.left(3)=="() ")
            record=record.mid(3);
        record.replace("()","(S)");
	return record;
}
void CDialects3::on_btUpdate_clicked()
{
	finish(Accepted);
}
void CDialects3::parseText(QString const & text)
{
	QString t(text);

	int r=0,lb=t.indexOf("("),rb;

	if(lb==-1)
	{
		on_btAdd_clicked();
        ((CLatCopt*)ui->tblWords->cellWidget(0,0))->setText(
			text.trimmed());
		return;
	}
	while(lb!=-1)
	{
		rb=t.indexOf(")",lb);
		if(rb!=-1)
		{
			on_btAdd_clicked();

			QString di(t.mid(lb+1,rb-lb-1));
			QStringList di_l(di.split(",",QString::SkipEmptyParts));
			for(int x=0;x<di_l.size();x++)
			{
				di_l[x]=di_l[x].trimmed();
				if(di_l[x]=="S")
                    ((QCheckBox*)ui->tblWords->cellWidget(r,1))
					->setChecked(true);
				else if(di_l[x]=="Sa")
                    ((QCheckBox*)ui->tblWords->cellWidget(r,2))
					->setChecked(true);
				else if(di_l[x]=="Sf")
                    ((QCheckBox*)ui->tblWords->cellWidget(r,3))
					->setChecked(true);
				else if(di_l[x]=="A")
                    ((QCheckBox*)ui->tblWords->cellWidget(r,4))
					->setChecked(true);
				else if(di_l[x]=="sA")
                    ((QCheckBox*)ui->tblWords->cellWidget(r,5))
					->setChecked(true);
				else if(di_l[x]=="B")
                    ((QCheckBox*)ui->tblWords->cellWidget(r,6))
					->setChecked(true);
				else if(di_l[x]=="F")
                    ((QCheckBox*)ui->tblWords->cellWidget(r,7))
					->setChecked(true);
				else if(di_l[x]=="Fb")
                    ((QCheckBox*)ui->tblWords->cellWidget(r,8))
					->setChecked(true);
				else if(di_l[x]=="O")
                    ((QCheckBox*)ui->tblWords->cellWidget(r,9))
					->setChecked(true);
                                else if(di_l[x]=="NH")
                                        ((QCheckBox*)ui->tblWords->cellWidget(r,10))
                                        ->setChecked(true);
			}

			lb=t.indexOf("(",rb);
			if(lb!=-1)
                ((CLatCopt*)ui->tblWords->cellWidget(r,0))->setText(
				t.mid(rb+1,lb-rb-1).trimmed());
			else
                ((CLatCopt*)ui->tblWords->cellWidget(r,0))->setText(
				t.mid(rb+1).trimmed());

			r++;
		}
		else
		{
			_err=true;
			_errtext="right bracket missing";
			finish(Rejected);
			return;
		}
	}
        ui->tblWords->resizeColumnsToContents();
}
QString const & CDialects3::errText() const
{
	return _errtext;
}
bool CDialects3::isValid() const
{
	return !_err;
}
void CDialects3::setText(QString const & copt,
	QString const & eng,QString const & gr)
{
    ui->tblWords->setRowCount(0);
	_err=false;
	_errtext=QString();
	result=Rejected;

	parseText(copt);
    ui->txtEnglish->setText(eng);
    ui->widgetGreek->setText(gr);
}
void CDialects3::finish(State r)
{
	result=r;
	emit finished(result);
}


void CDialects3::on_lstChooser_currentRowChanged(int currentRow)
{
    ui->stackedWidget->setCurrentIndex(currentRow);
}

void CDialects3::on_btTr_clicked()
{
    ui->txtEnglish->insert("{tr:} ");
}

void CDialects3::on_btIntr_clicked()
{
    ui->txtEnglish->insert("{intr:} ");
}

void CDialects3::on_btQual_clicked()
{
    ui->txtEnglish->insert("{qual:} ");
}

void CDialects3::on_btUnk_clicked()
{
    ui->txtEnglish->insert("(meaning unknown)");
}

void CDialects3::on_btUnc_clicked()
{
    ui->txtEnglish->insert("(meaning uncertain)");
}

void CDialects3::on_btNoun_clicked()
{
    ui->txtEnglish->insert("{noun:} ");
}

void CDialects3::on_btNounM_clicked()
{
    ui->txtEnglish->insert("{noun male:} ");
}

void CDialects3::on_btNounF_clicked()
{
    ui->txtEnglish->insert("{noun female:} ");
}

void CDialects3::on_btGk_clicked()
{
    ui->txtEnglish->insert(" /$gk: [[]]$/");
}

void CDialects3::on_btCaus_clicked()
{
    ui->txtEnglish->insert(" (/*causative of []*/)");
}

void CDialects3::on_btExt_clicked()
{
    QApplication::clipboard()->setText("*^<a href=\"ext name;id;chapter;verse;text\">Ext</a>^*");
}

void CDialects3::setFont(QFont const & Font)
{
    font=Font;
    ui->widgetGreek->refreshFonts();
}
